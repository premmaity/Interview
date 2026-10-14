from dataclasses import dataclass
from datetime import UTC, datetime
from functools import lru_cache

from fastapi import Cookie, Depends, Header
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.errors import AuthenticationError, AuthorizationError
from app.core.rate_limit import RateLimiter
from app.core.security import hash_token, tokens_equal
from app.db.session import get_db
from app.integrations.ai import AIProvider, SpeechToTextProvider
from app.integrations.fakes import FakeAIProvider, FakeSpeechToTextProvider
from app.integrations.groq import GroqAIProvider, GroqSpeechToTextProvider
from app.models.entities import AuthSession, User, UserStatus

SESSION_COOKIE = "im_session"
CSRF_COOKIE = "im_csrf"


@dataclass(frozen=True)
class CurrentAuth:
    user: User
    session: AuthSession


@lru_cache
def get_redis() -> Redis:
    settings = get_settings()
    return Redis.from_url(settings.redis_url, decode_responses=True)


@lru_cache
def get_rate_limiter() -> RateLimiter:
    return RateLimiter(get_redis())


@lru_cache
def get_ai_provider() -> AIProvider:
    settings = get_settings()
    if settings.ai_provider == "groq":
        assert settings.groq_api_key is not None
        return GroqAIProvider(
            api_key=settings.groq_api_key,
            model=settings.groq_model,
            timeout_seconds=settings.ai_timeout_seconds,
        )
    return FakeAIProvider()


@lru_cache
def get_stt_provider() -> SpeechToTextProvider:
    settings = get_settings()
    if settings.ai_provider == "groq":
        assert settings.groq_api_key is not None
        return GroqSpeechToTextProvider(
            api_key=settings.groq_api_key,
            timeout_seconds=settings.ai_timeout_seconds,
        )
    return FakeSpeechToTextProvider()


async def get_current_auth(
    session_token: str | None = Cookie(default=None, alias=SESSION_COOKIE),
    db: AsyncSession = Depends(get_db),
) -> CurrentAuth:
    if not session_token:
        raise AuthenticationError("Authentication required")
    row = await db.execute(
        select(AuthSession, User)
        .join(User, User.id == AuthSession.user_id)
        .where(
            AuthSession.token_hash == hash_token(session_token),
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > datetime.now(UTC),
            User.status == UserStatus.ACTIVE,
        )
    )
    result = row.first()
    if result is None:
        raise AuthenticationError("Session is invalid or expired")
    auth_session, user = result
    return CurrentAuth(user=user, session=auth_session)


async def require_csrf(
    auth: CurrentAuth = Depends(get_current_auth),
    csrf_cookie: str | None = Cookie(default=None, alias=CSRF_COOKIE),
    csrf_header: str | None = Header(default=None, alias="X-CSRF-Token"),
) -> CurrentAuth:
    if (
        not csrf_cookie
        or not csrf_header
        or not tokens_equal(csrf_cookie, csrf_header)
        or not tokens_equal(hash_token(csrf_header), auth.session.csrf_hash)
    ):
        raise AuthorizationError("CSRF validation failed")
    return auth
