from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.errors import AuthenticationError, ConflictError
from app.core.security import (
    hash_password,
    hash_token,
    new_opaque_token,
    validate_password_strength,
    verify_password,
)
from app.models.entities import AuditEvent, AuthSession, User, UserStatus


@dataclass(frozen=True)
class CreatedSession:
    user: User
    session_token: str
    csrf_token: str
    expires_at: datetime


class AuthService:
    def __init__(self, db: AsyncSession, settings: Settings) -> None:
        self.db = db
        self.settings = settings

    async def register(self, *, email: str, username: str | None, password: str) -> User:
        try:
            validate_password_strength(password)
        except ValueError as error:
            raise ConflictError(str(error)) from error
        condition = User.email == email
        if username is not None:
            condition = condition | (User.username == username)
        existing = await self.db.scalar(select(User).where(condition))
        if existing is not None:
            raise ConflictError("An account with those details already exists")
        user = User(email=email, username=username, password_hash=hash_password(password))
        self.db.add(user)
        await self.db.flush()
        self.db.add(
            AuditEvent(
                user_id=user.id,
                event_type="auth.registered",
                occurred_at=datetime.now(UTC),
                metadata_json={},
            )
        )
        await self.db.commit()
        await self.db.refresh(user)
        return user

    async def login(self, *, email: str, password: str, device: dict[str, str]) -> CreatedSession:
        user = await self.db.scalar(select(User).where(User.email == email))
        if (
            user is None
            or user.status != UserStatus.ACTIVE
            or not verify_password(password, user.password_hash)
        ):
            raise AuthenticationError("Invalid email or password")
        return await self._create_session(user, device)

    async def _create_session(self, user: User, device: dict[str, str]) -> CreatedSession:
        now = datetime.now(UTC)
        session_token = new_opaque_token()
        csrf_token = new_opaque_token()
        expires_at = now + timedelta(hours=self.settings.session_ttl_hours)
        auth_session = AuthSession(
            user_id=user.id,
            token_hash=hash_token(session_token),
            csrf_hash=hash_token(csrf_token),
            expires_at=expires_at,
            created_at=now,
            last_seen_at=now,
            device_metadata=device,
        )
        self.db.add(auth_session)
        self.db.add(
            AuditEvent(
                user_id=user.id,
                event_type="auth.login",
                occurred_at=now,
                metadata_json={},
            )
        )
        await self.db.commit()
        return CreatedSession(user, session_token, csrf_token, expires_at)

    async def logout(self, auth_session: AuthSession) -> None:
        auth_session.revoked_at = datetime.now(UTC)
        self.db.add(
            AuditEvent(
                user_id=auth_session.user_id,
                event_type="auth.logout",
                occurred_at=datetime.now(UTC),
                metadata_json={},
            )
        )
        await self.db.commit()

    async def rotate_csrf(self, auth_session: AuthSession) -> str:
        csrf_token = new_opaque_token()
        auth_session.csrf_hash = hash_token(csrf_token)
        auth_session.last_seen_at = datetime.now(UTC)
        await self.db.commit()
        return csrf_token

    async def delete_account(self, user: User, *, password: str, confirmation: str) -> None:
        if confirmation != "DELETE MY ACCOUNT" or not verify_password(password, user.password_hash):
            raise AuthenticationError("Account deletion could not be verified")
        await self.db.delete(user)
        await self.db.commit()
