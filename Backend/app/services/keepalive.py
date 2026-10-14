import asyncio
import uuid
from datetime import UTC, datetime
from urllib.parse import urlsplit, urlunsplit

import httpx
import structlog
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ConflictError, NotFoundError
from app.db.session import SessionFactory
from app.models.entities import KeepAliveProject, User
from app.schemas.keepalive import KeepAliveProjectCreate

logger = structlog.get_logger()
MAX_PROJECTS_PER_USER = 20
PING_TIMEOUT_SECONDS = 60.0
_scheduler_wakeup: asyncio.Event | None = None


def normalize_render_url(value: str) -> str:
    raw = value.strip()
    try:
        parsed = urlsplit(raw)
        port = parsed.port
    except ValueError as error:
        raise ConflictError("Enter a valid Render HTTPS URL") from error

    hostname = (parsed.hostname or "").lower().rstrip(".")
    if (
        parsed.scheme.lower() != "https"
        or not hostname.endswith(".onrender.com")
        or hostname == ".onrender.com"
        or parsed.username is not None
        or parsed.password is not None
        or port is not None
        or parsed.query
        or parsed.fragment
    ):
        raise ConflictError("Only public HTTPS *.onrender.com URLs are allowed")

    path = parsed.path or "/"
    normalized_path = path if path == "/" else path.rstrip("/")
    return urlunsplit(("https", hostname, normalized_path, "", ""))


class KeepAliveService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list(self, user: User) -> list[KeepAliveProject]:
        rows = await self.db.scalars(
            select(KeepAliveProject)
            .where(KeepAliveProject.user_id == user.id)
            .order_by(KeepAliveProject.created_at.desc())
        )
        return list(rows)

    async def create(self, user: User, payload: KeepAliveProjectCreate) -> KeepAliveProject:
        project_count = await self.db.scalar(
            select(func.count()).select_from(KeepAliveProject).where(
                KeepAliveProject.user_id == user.id
            )
        )
        if (project_count or 0) >= MAX_PROJECTS_PER_USER:
            raise ConflictError(f"You can monitor up to {MAX_PROJECTS_PER_USER} Render projects")

        url = normalize_render_url(payload.url)
        existing = await self.db.scalar(
            select(KeepAliveProject).where(
                KeepAliveProject.user_id == user.id,
                KeepAliveProject.url == url,
            )
        )
        if existing is not None:
            raise ConflictError("This Render URL is already in your list")

        name = payload.name.strip()
        if not name:
            raise ConflictError("Project name cannot be empty")

        project = KeepAliveProject(
            user_id=user.id,
            name=name,
            url=url,
            enabled=False,
        )
        self.db.add(project)
        await self.db.commit()
        await self.db.refresh(project)
        return project

    async def set_enabled(
        self, user: User, project_id: uuid.UUID, *, enabled: bool
    ) -> KeepAliveProject:
        project = await self._get(user, project_id)
        project.enabled = enabled
        if not enabled:
            project.last_error = None
        await self.db.commit()
        await self.db.refresh(project)
        if enabled:
            wake_keepalive_scheduler()
        return project

    async def delete(self, user: User, project_id: uuid.UUID) -> None:
        project = await self._get(user, project_id)
        await self.db.delete(project)
        await self.db.commit()

    async def _get(self, user: User, project_id: uuid.UUID) -> KeepAliveProject:
        project = await self.db.scalar(
            select(KeepAliveProject).where(
                KeepAliveProject.id == project_id,
                KeepAliveProject.user_id == user.id,
            )
        )
        if project is None:
            raise NotFoundError("Keep-alive project not found")
        return project


async def _ping(client: httpx.AsyncClient, url: str) -> tuple[int | None, str | None]:
    try:
        async with client.stream("GET", url) as response:
            return response.status_code, None
    except httpx.HTTPError as error:
        return None, str(error)[:300]


async def run_keepalive_cycle() -> int:
    async with SessionFactory() as db:
        rows = await db.execute(
            select(KeepAliveProject.id, KeepAliveProject.url).where(
                KeepAliveProject.enabled.is_(True)
            )
        )
        projects = [(row.id, row.url) for row in rows]
        if not projects:
            return 0

        timeout = httpx.Timeout(PING_TIMEOUT_SECONDS)
        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=False,
            headers={"User-Agent": "Interview-Mentor-KeepAlive/1.0"},
        ) as client:
            results = await asyncio.gather(*(_ping(client, url) for _, url in projects))

        pinged_at = datetime.now(UTC)
        for (project_id, _), (status_code, error) in zip(projects, results, strict=True):
            await db.execute(
                update(KeepAliveProject)
                .where(
                    KeepAliveProject.id == project_id,
                    KeepAliveProject.enabled.is_(True),
                )
                .values(
                    last_ping_at=pinged_at,
                    last_status_code=status_code,
                    last_error=error,
                )
            )
        await db.commit()
        logger.info("keepalive_cycle_completed", project_count=len(projects))
        return len(projects)


def wake_keepalive_scheduler() -> None:
    if _scheduler_wakeup is not None:
        _scheduler_wakeup.set()


async def keepalive_scheduler(interval_seconds: int) -> None:
    global _scheduler_wakeup
    _scheduler_wakeup = asyncio.Event()
    try:
        while True:
            try:
                await run_keepalive_cycle()
            except Exception:
                logger.exception("keepalive_cycle_failed")
            try:
                await asyncio.wait_for(_scheduler_wakeup.wait(), timeout=interval_seconds)
            except TimeoutError:
                pass
            _scheduler_wakeup.clear()
    finally:
        _scheduler_wakeup = None
