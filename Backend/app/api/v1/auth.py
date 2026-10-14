from fastapi import APIRouter, Depends, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    CSRF_COOKIE,
    SESSION_COOKIE,
    CurrentAuth,
    get_current_auth,
    get_rate_limiter,
    require_csrf,
)
from app.core.config import Settings, get_settings
from app.core.errors import AuthorizationError
from app.core.rate_limit import RateLimiter
from app.db.session import get_db
from app.models.entities import User
from app.schemas.auth import (
    AuthResponse,
    CsrfResponse,
    DeleteAccountRequest,
    LoginRequest,
    MessageResponse,
    RecoveryRequest,
    RegisterRequest,
    UserResponse,
)
from app.services.auth import AuthService, CreatedSession

router = APIRouter(prefix="/auth", tags=["auth"])


def set_auth_cookies(response: Response, created: CreatedSession, settings: Settings) -> None:
    max_age = settings.session_ttl_hours * 3600
    response.set_cookie(
        SESSION_COOKIE,
        created.session_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
        max_age=max_age,
    )
    response.set_cookie(
        CSRF_COOKIE,
        created.csrf_token,
        httponly=False,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
        max_age=max_age,
    )


def set_csrf_cookie(response: Response, token: str, settings: Settings) -> None:
    response.set_cookie(
        CSRF_COOKIE,
        token,
        httponly=False,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
        max_age=settings.session_ttl_hours * 3600,
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    limiter: RateLimiter = Depends(get_rate_limiter),
    settings: Settings = Depends(get_settings),
) -> User:
    await limiter.check(
        f"register:{request.client.host if request.client else 'unknown'}",
        limit=5,
        window_seconds=300,
    )
    return await AuthService(db, settings).register(**payload.model_dump())


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
    limiter: RateLimiter = Depends(get_rate_limiter),
    settings: Settings = Depends(get_settings),
) -> AuthResponse:
    ip = request.client.host if request.client else "unknown"
    await limiter.check(f"login:{ip}:{payload.email}", limit=8, window_seconds=300)
    created = await AuthService(db, settings).login(
        **payload.model_dump(),
        device={"user_agent": request.headers.get("user-agent", "")[:200]},
    )
    set_auth_cookies(response, created, settings)
    return AuthResponse(
        user=UserResponse.model_validate(created.user), csrf_token=created.csrf_token
    )


@router.post("/refresh", response_model=AuthResponse)
async def refresh(
    response: Response,
    auth: CurrentAuth = Depends(require_csrf),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> AuthResponse:
    service = AuthService(db, settings)
    await service.logout(auth.session)
    created = await service._create_session(auth.user, auth.session.device_metadata)
    set_auth_cookies(response, created, settings)
    return AuthResponse(
        user=UserResponse.model_validate(created.user), csrf_token=created.csrf_token
    )


@router.post("/csrf", response_model=CsrfResponse)
async def bootstrap_csrf(
    request: Request,
    response: Response,
    auth: CurrentAuth = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> CsrfResponse:
    if request.headers.get("origin") != settings.frontend_origin:
        raise AuthorizationError("CSRF bootstrap origin is not allowed")
    token = await AuthService(db, settings).rotate_csrf(auth.session)
    set_csrf_cookie(response, token, settings)
    return CsrfResponse(csrf_token=token)


@router.post("/logout", response_model=MessageResponse)
async def logout(
    response: Response,
    auth: CurrentAuth = Depends(require_csrf),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> MessageResponse:
    await AuthService(db, settings).logout(auth.session)
    response.delete_cookie(SESSION_COOKIE, path="/")
    response.delete_cookie(CSRF_COOKIE, path="/")
    return MessageResponse(message="Signed out")


@router.get("/me", response_model=UserResponse)
async def me(auth: CurrentAuth = Depends(get_current_auth)) -> User:
    return auth.user


@router.delete("/me", response_model=MessageResponse)
async def delete_account(
    payload: DeleteAccountRequest,
    response: Response,
    auth: CurrentAuth = Depends(require_csrf),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> MessageResponse:
    await AuthService(db, settings).delete_account(auth.user, **payload.model_dump())
    response.delete_cookie(SESSION_COOKIE, path="/")
    response.delete_cookie(CSRF_COOKIE, path="/")
    return MessageResponse(message="Account and owned data deleted")


@router.post(
    "/recovery/request", response_model=MessageResponse, status_code=status.HTTP_202_ACCEPTED
)
async def request_recovery(
    payload: RecoveryRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    limiter: RateLimiter = Depends(get_rate_limiter),
) -> MessageResponse:
    ip = request.client.host if request.client else "unknown"
    await limiter.check(f"recovery:{ip}", limit=5, window_seconds=900)
    await db.scalar(select(User.id).where(User.email == str(payload.email).casefold()))
    return MessageResponse(message="If the account exists, recovery instructions will be sent")
