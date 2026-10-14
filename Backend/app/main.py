import time
import uuid
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response

from app.api.health import router as health_router
from app.api.v1.auth import router as auth_router
from app.api.v1.interviews import audio_router
from app.api.v1.interviews import router as interviews_router
from app.api.v1.profile import router as profile_router
from app.core.config import get_settings
from app.core.errors import AppError
from app.core.logging import configure_logging

settings = get_settings()
configure_logging(settings.log_level)
logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    logger.info("application_started", environment=settings.app_env)
    yield
    logger.info("application_stopped")


class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        started = time.perf_counter()
        incoming = request.headers.get("X-Request-ID", "")
        request_id = (
            incoming[:64] if incoming and incoming.replace("-", "").isalnum() else str(uuid.uuid4())
        )
        request.state.request_id = request_id
        structlog.contextvars.bind_contextvars(request_id=request_id)
        try:
            response = await call_next(request)
        finally:
            duration_ms = round((time.perf_counter() - started) * 1000, 2)
            logger.info(
                "request_completed",
                method=request.method,
                path=request.url.path,
                duration_ms=duration_ms,
            )
            structlog.contextvars.clear_contextvars()
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(self), geolocation=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; "
            "img-src 'self' data:; media-src 'self' blob:; connect-src 'self' "
            f"{settings.frontend_origin}; script-src 'self'; style-src 'self' 'unsafe-inline'"
        )
        if settings.app_env == "production":
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    description="AI-assisted interview coaching; not an automated hiring-decision system.",
    lifespan=lifespan,
)
app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_origin],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "X-CSRF-Token", "X-Request-ID"],
    expose_headers=["X-Request-ID"],
)


@app.exception_handler(AppError)
async def app_error_handler(request: Request, error: AppError) -> JSONResponse:
    request_id = getattr(request.state, "request_id", "")
    headers = {"Retry-After": "60"} if error.status_code == 429 else None
    return JSONResponse(
        status_code=error.status_code,
        content={
            "error": {
                "code": error.code,
                "message": error.message,
                "request_id": request_id,
            }
        },
        headers=headers,
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, error: RequestValidationError) -> JSONResponse:
    del error
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "validation_error",
                "message": "Request validation failed",
                "request_id": getattr(request.state, "request_id", ""),
            }
        },
    )


app.include_router(health_router)
app.include_router(auth_router, prefix="/api/v1")
app.include_router(profile_router, prefix="/api/v1")
app.include_router(interviews_router, prefix="/api/v1")
app.include_router(audio_router, prefix="/api/v1")
