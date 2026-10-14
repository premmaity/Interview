import uuid

from pydantic import BaseModel, ConfigDict, Field


class ProfileUpdate(BaseModel):
    target_role: str = Field(min_length=1, max_length=120)
    seniority: str = Field(min_length=1, max_length=40)
    years_experience: int = Field(ge=0, le=80)
    skills: list[str] = Field(default_factory=list, max_length=50)
    preferred_language: str = Field(default="English", min_length=2, max_length=40)
    job_description: str | None = Field(default=None, max_length=20_000)


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    target_role: str
    seniority: str
    years_experience: int
    skills: list[str]
    preferred_language: str
    job_description: str | None
    resume_reference: str | None
