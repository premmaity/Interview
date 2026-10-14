from fastapi import APIRouter, Depends, Response, status
from redis.asyncio import Redis
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import get_redis
from app.core.config import Settings, get_settings
from app.db.session import get_db

router = APIRouter(tags=["health"])


@router.get("/health/live")
async def live() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/health/ready")
async def ready(
    response: Response,
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
    settings: Settings = Depends(get_settings),
) -> dict[str, object]:
    checks: dict[str, str] = {}
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "unavailable"
    try:
        await redis.ping()
        checks["redis"] = "ok"
    except Exception:
        checks["redis"] = (
            "optional-unavailable" if settings.evaluation_dispatch == "inline" else "unavailable"
        )
    required_ready = checks["database"] == "ok" and (
        checks["redis"] == "ok" or settings.evaluation_dispatch == "inline"
    )
    if not required_ready:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    return {"status": "ready" if required_ready else "not-ready", "checks": checks}
