import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class KeepAliveProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    url: str = Field(min_length=1, max_length=2048)


class KeepAliveProjectUpdate(BaseModel):
    enabled: bool


class KeepAliveProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    url: str
    enabled: bool
    last_ping_at: datetime | None
    last_status_code: int | None
    last_error: str | None
    created_at: datetime


class KeepAliveProjectList(BaseModel):
    items: list[KeepAliveProjectResponse]
