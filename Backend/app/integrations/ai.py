from typing import Protocol

from pydantic import BaseModel, Field

from app.models.entities import Difficulty, RoundType


class QuestionContract(BaseModel):
    text: str = Field(min_length=5, max_length=2000)
    question_type: RoundType
    difficulty: Difficulty
    rubric_tags: list[str] = Field(min_length=1, max_length=10)
    expected_coverage: list[str] = Field(min_length=1, max_length=10)
    follow_up_intent: str | None = Field(default=None, max_length=500)


class EvaluationContract(BaseModel):
    overall_score: float = Field(ge=0, le=100)
    category_scores: dict[str, float]
    evidence: list[str] = Field(max_length=10)
    strengths: list[str] = Field(max_length=10)
    gaps: list[str] = Field(max_length=10)
    improvement_advice: list[str] = Field(max_length=10)
    suggested_answer: str = Field(max_length=5000)
    confidence: float = Field(ge=0, le=1)


class AIProvider(Protocol):
    model_name: str

    async def generate_question(
        self,
        *,
        target_role: str,
        seniority: str,
        round_type: RoundType,
        difficulty: Difficulty,
        sequence: int,
        prior_questions: list[str],
        custom_focus: str | None,
    ) -> QuestionContract: ...

    async def evaluate_answer(
        self,
        *,
        question: QuestionContract,
        answer: str,
        target_role: str,
        seniority: str,
    ) -> EvaluationContract: ...


class SpeechToTextProvider(Protocol):
    async def transcribe(self, *, data: bytes, media_type: str, language: str) -> str: ...
