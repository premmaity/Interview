import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.entities import Difficulty, InputMode, InterviewStatus, RoundType


class InterviewCreate(BaseModel):
    target_role: str = Field(min_length=1, max_length=120)
    seniority: str = Field(min_length=1, max_length=40)
    round_type: RoundType
    difficulty: Difficulty
    question_count: int = Field(default=5, ge=1, le=20)
    input_mode: InputMode = InputMode.TEXT
    custom_focus: str | None = Field(default=None, max_length=1000)
    job_description: str | None = Field(default=None, max_length=20_000)


class AnswerSubmit(BaseModel):
    question_id: uuid.UUID
    client_request_id: str = Field(min_length=8, max_length=100)
    text: str = Field(min_length=1, max_length=20_000)
    source_mode: InputMode = InputMode.TEXT
    duration_seconds: int | None = Field(default=None, ge=0, le=7200)


class QuestionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sequence: int
    question_type: RoundType
    text: str
    rubric_tags: list[str]


class AnswerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    question_id: uuid.UUID
    text: str
    source_mode: InputMode
    submitted_at: datetime


class InterviewResponse(BaseModel):
    id: uuid.UUID
    status: InterviewStatus
    target_role: str
    seniority: str
    round_type: RoundType
    difficulty: Difficulty
    input_mode: InputMode
    question_count: int
    current_question_number: int
    created_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    current_question: QuestionResponse | None = None
    questions: list[QuestionResponse] = Field(default_factory=list)
    answers: list[AnswerResponse] = Field(default_factory=list)


class InterviewList(BaseModel):
    items: list[InterviewResponse]
    next_cursor: str | None = None


class EvaluationResponse(BaseModel):
    answer_id: uuid.UUID | None
    overall_score: float
    category_scores: dict[str, float]
    evidence: list[str]
    strengths: list[str]
    gaps: list[str]
    improvement_advice: list[str]
    suggested_answer: str
    confidence: float


class ReportResponse(BaseModel):
    session_id: uuid.UUID
    status: InterviewStatus
    overall_score: float
    category_scores: dict[str, float]
    answer_feedback: list[EvaluationResponse]
    strengths: list[str]
    gaps: list[str]
    recommended_topics: list[str]
    practice_plan: list[str]
    disclaimer: str = "Scores are coaching feedback, not objective hiring decisions."


class TranscriptionResponse(BaseModel):
    transcript: str
    retained: bool
    metadata: dict[str, Any] = Field(default_factory=dict)
