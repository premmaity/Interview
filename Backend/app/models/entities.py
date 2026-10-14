import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class UserStatus(enum.StrEnum):
    ACTIVE = "active"
    DISABLED = "disabled"
    DELETED = "deleted"


class InterviewStatus(enum.StrEnum):
    CREATED = "created"
    ACTIVE = "active"
    EVALUATING = "evaluating"
    COMPLETED = "completed"
    ABANDONED = "abandoned"
    FAILED = "failed"


class RoundType(enum.StrEnum):
    TECHNICAL = "technical"
    BEHAVIORAL = "behavioral"
    SYSTEM_DESIGN = "system_design"
    MIXED = "mixed"
    CUSTOM = "custom"


class Difficulty(enum.StrEnum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class InputMode(enum.StrEnum):
    TEXT = "text"
    VOICE = "voice"


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    username: Mapped[str | None] = mapped_column(String(64), unique=True)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    status: Mapped[UserStatus] = mapped_column(
        Enum(UserStatus, native_enum=False), default=UserStatus.ACTIVE, nullable=False, index=True
    )

    profile: Mapped["CandidateProfile | None"] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    sessions: Mapped[list["InterviewSession"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class AuthSession(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "auth_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    csrf_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    device_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)


class CandidateProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "candidate_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    target_role: Mapped[str] = mapped_column(String(120), default="", nullable=False)
    seniority: Mapped[str] = mapped_column(String(40), default="mid", nullable=False)
    years_experience: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    skills: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    preferred_language: Mapped[str] = mapped_column(String(40), default="English", nullable=False)
    resume_reference: Mapped[str | None] = mapped_column(String(512))
    job_description: Mapped[str | None] = mapped_column(Text)

    user: Mapped[User] = relationship(back_populates="profile")

    __table_args__ = (
        CheckConstraint(
            "years_experience >= 0 AND years_experience <= 80", name="experience_range"
        ),
    )


class InterviewTemplate(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "interview_templates"

    owner_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    round_type: Mapped[RoundType] = mapped_column(
        Enum(RoundType, native_enum=False), nullable=False
    )
    difficulty: Mapped[Difficulty] = mapped_column(
        Enum(Difficulty, native_enum=False), nullable=False
    )
    question_policy: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    rubric_version: Mapped[str] = mapped_column(String(40), default="rubric-v1", nullable=False)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class InterviewSession(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "interview_sessions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    template_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("interview_templates.id", ondelete="SET NULL")
    )
    status: Mapped[InterviewStatus] = mapped_column(
        Enum(InterviewStatus, native_enum=False), default=InterviewStatus.CREATED, index=True
    )
    target_role: Mapped[str] = mapped_column(String(120), nullable=False)
    seniority: Mapped[str] = mapped_column(String(40), nullable=False)
    round_type: Mapped[RoundType] = mapped_column(
        Enum(RoundType, native_enum=False), nullable=False
    )
    difficulty: Mapped[Difficulty] = mapped_column(
        Enum(Difficulty, native_enum=False), nullable=False
    )
    input_mode: Mapped[InputMode] = mapped_column(
        Enum(InputMode, native_enum=False), nullable=False
    )
    question_count: Mapped[int] = mapped_column(Integer, nullable=False)
    current_question_number: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    config_snapshot: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(40), default="question-v1", nullable=False)
    model_version: Mapped[str] = mapped_column(String(120), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    failure_code: Mapped[str | None] = mapped_column(String(80))

    user: Mapped[User] = relationship(back_populates="sessions")
    questions: Mapped[list["InterviewQuestion"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="InterviewQuestion.sequence",
    )
    evaluations: Mapped[list["Evaluation"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint(
            "question_count >= 1 AND question_count <= 50", name="question_count_range"
        ),
        CheckConstraint("current_question_number >= 0", name="current_question_nonnegative"),
        Index("ix_interview_sessions_user_created", "user_id", "created_at"),
    )


class InterviewQuestion(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "interview_questions"

    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    question_type: Mapped[RoundType] = mapped_column(
        Enum(RoundType, native_enum=False), nullable=False
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    rubric_tags: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    expected_coverage: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    generated_metadata: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)

    session: Mapped[InterviewSession] = relationship(back_populates="questions")
    answer: Mapped["InterviewAnswer | None"] = relationship(
        back_populates="question", cascade="all, delete-orphan"
    )

    __table_args__ = (UniqueConstraint("session_id", "sequence", name="uq_question_session_seq"),)


class InterviewAnswer(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "interview_answers"

    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("interview_questions.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    client_request_id: Mapped[str] = mapped_column(String(100), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    source_mode: Mapped[InputMode] = mapped_column(
        Enum(InputMode, native_enum=False), nullable=False
    )
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    artifact_reference: Mapped[str | None] = mapped_column(String(512))
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    question: Mapped[InterviewQuestion] = relationship(back_populates="answer")

    __table_args__ = (
        UniqueConstraint("session_id", "client_request_id", name="uq_answer_session_request"),
    )


class Evaluation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "evaluations"

    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("interview_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    answer_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("interview_answers.id", ondelete="CASCADE"), unique=True
    )
    overall_score: Mapped[float] = mapped_column(Float, nullable=False)
    category_scores: Mapped[dict[str, float]] = mapped_column(JSON, default=dict, nullable=False)
    evidence: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    strengths: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    gaps: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    improvement_advice: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    suggested_answer: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, nullable=False)
    model_version: Mapped[str] = mapped_column(String(120), nullable=False)
    prompt_version: Mapped[str] = mapped_column(String(40), nullable=False)

    session: Mapped[InterviewSession] = relationship(back_populates="evaluations")

    __table_args__ = (
        CheckConstraint("overall_score >= 0 AND overall_score <= 100", name="score_range"),
        CheckConstraint("confidence >= 0 AND confidence <= 1", name="confidence_range"),
    )


class QuizAttempt(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "quiz_attempts"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    subject: Mapped[str] = mapped_column(String(120), nullable=False)
    difficulty: Mapped[Difficulty] = mapped_column(
        Enum(Difficulty, native_enum=False), nullable=False
    )
    score: Mapped[float | None] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(32), default="created", nullable=False)


class QuizAnswer(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "quiz_answers"

    attempt_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("quiz_attempts.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sequence: Mapped[int] = mapped_column(Integer, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    is_correct: Mapped[bool | None] = mapped_column(Boolean)

    __table_args__ = (UniqueConstraint("attempt_id", "sequence", name="uq_quiz_answer_seq"),)


class AuditEvent(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "audit_events"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    occurred_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    request_id: Mapped[str | None] = mapped_column(String(80))
    metadata_json: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict, nullable=False)
    ip_hash: Mapped[bytes | None] = mapped_column(LargeBinary(32))
