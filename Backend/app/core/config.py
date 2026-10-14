from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "Interview Mentor"
    app_env: Literal["development", "test", "production"] = "development"
    database_url: str = "sqlite+aiosqlite:///./interview.db"
    redis_url: str = "redis://localhost:6379/0"
    frontend_origin: str = "http://localhost:5173"
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "strict", "none"] = "lax"
    session_ttl_hours: int = Field(default=168, ge=1, le=720)
    ai_provider: Literal["fake", "groq"] = "fake"
    groq_api_key: str | None = None
    groq_model: str = "llama-3.3-70b-versatile"
    ai_timeout_seconds: float = Field(default=20, ge=1, le=120)
    max_questions_per_session: int = Field(default=20, ge=1, le=50)
    upload_max_bytes: int = Field(default=10_485_760, ge=1024, le=26_214_400)
    raw_audio_retention_hours: int = Field(default=0, ge=0, le=24)
    log_level: str = "INFO"
    evaluation_dispatch: Literal["inline", "redis"] = "inline"
    static_dir: str | None = None

    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value: object) -> object:
        if isinstance(value, str) and value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+asyncpg://", 1)
        if isinstance(value, str) and value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+asyncpg://", 1)
        return value

    @model_validator(mode="after")
    def validate_production(self) -> "Settings":
        if self.cookie_samesite == "none" and not self.cookie_secure:
            raise ValueError("SameSite=None requires secure cookies")
        if self.app_env == "production":
            if not self.database_url.startswith("postgresql+asyncpg://"):
                raise ValueError("production requires PostgreSQL via asyncpg")
            if not self.cookie_secure:
                raise ValueError("production requires secure cookies")
            if self.frontend_origin.startswith("http://"):
                raise ValueError("production frontend origin must use HTTPS")
        if self.ai_provider == "groq" and not self.groq_api_key:
            raise ValueError("GROQ_API_KEY is required when AI_PROVIDER=groq")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
