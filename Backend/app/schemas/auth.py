import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str | None = Field(
        default=None, min_length=3, max_length=64, pattern=r"^[a-zA-Z0-9_.-]+$"
    )
    password: str = Field(min_length=12, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().casefold()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().casefold()


class RecoveryRequest(BaseModel):
    email: EmailStr


class DeleteAccountRequest(BaseModel):
    password: str = Field(min_length=1, max_length=128)
    confirmation: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    username: str | None
    created_at: datetime


class AuthResponse(BaseModel):
    user: UserResponse
    csrf_token: str


class CsrfResponse(BaseModel):
    csrf_token: str


class MessageResponse(BaseModel):
    message: str
