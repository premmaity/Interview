import json
import uuid
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from fastapi.responses import Response, StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import (
    CurrentAuth,
    get_ai_provider,
    get_current_auth,
    get_rate_limiter,
    get_stt_provider,
    require_csrf,
)
from app.core.config import Settings, get_settings
from app.core.errors import ConflictError, NotFoundError
from app.core.rate_limit import RateLimiter
from app.db.session import get_db
from app.integrations.ai import AIProvider, SpeechToTextProvider
from app.models.entities import Evaluation, InterviewSession
from app.schemas.auth import MessageResponse
from app.schemas.interviews import (
    AnswerResponse,
    AnswerSubmit,
    EvaluationResponse,
    InterviewCreate,
    InterviewList,
    InterviewResponse,
    QuestionResponse,
    ReportResponse,
    TranscriptionResponse,
)
from app.services.interviews import InterviewService

router = APIRouter(prefix="/interviews", tags=["interviews"])
audio_router = APIRouter(prefix="/audio", tags=["audio"])


def present(session: InterviewSession) -> InterviewResponse:
    questions = [QuestionResponse.model_validate(item) for item in session.questions]
    answers = [
        AnswerResponse.model_validate(question.answer)
        for question in session.questions
        if question.answer is not None
    ]
    current = next(
        (
            question
            for question in questions
            if question.sequence == session.current_question_number
        ),
        None,
    )
    return InterviewResponse(
        id=session.id,
        status=session.status,
        target_role=session.target_role,
        seniority=session.seniority,
        round_type=session.round_type,
        difficulty=session.difficulty,
        input_mode=session.input_mode,
        question_count=session.question_count,
        current_question_number=session.current_question_number,
        created_at=session.created_at,
        started_at=session.started_at,
        completed_at=session.completed_at,
        current_question=current,
        questions=questions,
        answers=answers,
    )


def service(db: AsyncSession, settings: Settings, ai: AIProvider) -> InterviewService:
    return InterviewService(db, settings, ai)


@router.post("", response_model=InterviewResponse, status_code=status.HTTP_201_CREATED)
async def create_interview(
    payload: InterviewCreate,
    auth: CurrentAuth = Depends(require_csrf),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
    ai: AIProvider = Depends(get_ai_provider),
    limiter: RateLimiter = Depends(get_rate_limiter),
) -> InterviewResponse:
    await limiter.check(f"interview-create:{auth.user.id}", limit=20, window_seconds=3600)
    return present(await service(db, settings, ai).create(auth.user, payload))


@router.get("", response_model=InterviewList)
async def list_interviews(
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = Query(default=None),
    auth: CurrentAuth = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
    ai: AIProvider = Depends(get_ai_provider),
) -> InterviewList:
    items, next_cursor = await service(db, settings, ai).list(auth.user, limit=limit, cursor=cursor)
    return InterviewList(items=[present(item) for item in items], next_cursor=next_cursor)


@router.get("/{session_id}", response_model=InterviewResponse)
async def get_interview(
    session_id: uuid.UUID,
    auth: CurrentAuth = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
    ai: AIProvider = Depends(get_ai_provider),
) -> InterviewResponse:
    return present(await service(db, settings, ai).get(auth.user, session_id))


@router.post("/{session_id}/start", response_model=InterviewResponse)
async def start_interview(
    session_id: uuid.UUID,
    auth: CurrentAuth = Depends(require_csrf),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
    ai: AIProvider = Depends(get_ai_provider),
) -> InterviewResponse:
    return present(await service(db, settings, ai).start(auth.user, session_id))


@router.post("/{session_id}/answers", response_model=InterviewResponse)
async def submit_answer(
    session_id: uuid.UUID,
    payload: AnswerSubmit,
    auth: CurrentAuth = Depends(require_csrf),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
    ai: AIProvider = Depends(get_ai_provider),
    limiter: RateLimiter = Depends(get_rate_limiter),
) -> InterviewResponse:
    await limiter.check(f"interview-answer:{auth.user.id}", limit=60, window_seconds=600)
    return present(await service(db, settings, ai).submit_answer(auth.user, session_id, payload))


@router.post("/{session_id}/complete", response_model=InterviewResponse)
async def complete_interview(
    session_id: uuid.UUID,
    auth: CurrentAuth = Depends(require_csrf),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
    ai: AIProvider = Depends(get_ai_provider),
) -> InterviewResponse:
    return present(await service(db, settings, ai).complete(auth.user, session_id))


@router.post("/{session_id}/transcriptions", response_model=TranscriptionResponse)
async def transcribe_answer(
    session_id: uuid.UUID,
    file: UploadFile = File(...),
    consent: bool = Form(...),
    language: str = Form(default="en"),
    auth: CurrentAuth = Depends(require_csrf),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
    ai: AIProvider = Depends(get_ai_provider),
    stt: SpeechToTextProvider = Depends(get_stt_provider),
    limiter: RateLimiter = Depends(get_rate_limiter),
) -> TranscriptionResponse:
    if not consent:
        raise ConflictError("Consent is required to process a recording")
    await limiter.check(f"transcription:{auth.user.id}", limit=20, window_seconds=3600)
    await service(db, settings, ai).get(auth.user, session_id)
    allowed = {"audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav"}
    media_type = (file.content_type or "").split(";", 1)[0]
    if media_type not in allowed:
        raise ConflictError("Unsupported audio format")
    data = await file.read(settings.upload_max_bytes + 1)
    await file.close()
    if len(data) > settings.upload_max_bytes:
        raise ConflictError("Audio upload is too large")
    transcript = await stt.transcribe(data=data, media_type=media_type, language=language[:12])
    return TranscriptionResponse(
        transcript=transcript,
        retained=False,
        metadata={"raw_audio_deleted": True},
    )


@router.get("/{session_id}/events")
async def interview_events(
    session_id: uuid.UUID,
    auth: CurrentAuth = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
    ai: AIProvider = Depends(get_ai_provider),
) -> StreamingResponse:
    session = await service(db, settings, ai).get(auth.user, session_id)

    async def stream() -> AsyncIterator[str]:
        payload = json.dumps({"session_id": str(session.id), "status": session.status.value})
        yield f"event: session\ndata: {payload}\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


@router.get("/{session_id}/report", response_model=ReportResponse)
async def get_report(
    session_id: uuid.UUID,
    auth: CurrentAuth = Depends(get_current_auth),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
    ai: AIProvider = Depends(get_ai_provider),
) -> ReportResponse:
    session = await service(db, settings, ai).get(auth.user, session_id)
    summary = next((item for item in session.evaluations if item.answer_id is None), None)
    if summary is None:
        raise ConflictError("Report is not ready")
    answer_feedback = [
        evaluation_response(item) for item in session.evaluations if item.answer_id is not None
    ]
    topics = [gap.removeprefix("Did not clearly address ") for gap in summary.gaps][:5]
    return ReportResponse(
        session_id=session.id,
        status=session.status,
        overall_score=summary.overall_score,
        category_scores=summary.category_scores,
        answer_feedback=answer_feedback,
        strengths=summary.strengths,
        gaps=summary.gaps,
        recommended_topics=topics,
        practice_plan=[
            "Day 1: review the weakest rubric topic and write a five-point outline.",
            "Day 2: record two timed answers and edit their transcripts.",
            "Day 3: repeat this round and compare evidence, not just the score.",
        ],
    )


def evaluation_response(item: Evaluation) -> EvaluationResponse:
    return EvaluationResponse(
        answer_id=item.answer_id,
        overall_score=item.overall_score,
        category_scores=item.category_scores,
        evidence=item.evidence,
        strengths=item.strengths,
        gaps=item.gaps,
        improvement_advice=item.improvement_advice,
        suggested_answer=item.suggested_answer,
        confidence=item.confidence,
    )


@router.delete("/{session_id}", response_model=MessageResponse)
async def delete_interview(
    session_id: uuid.UUID,
    auth: CurrentAuth = Depends(require_csrf),
    db: AsyncSession = Depends(get_db),
    settings: Settings = Depends(get_settings),
    ai: AIProvider = Depends(get_ai_provider),
) -> MessageResponse:
    await service(db, settings, ai).delete(auth.user, session_id)
    return MessageResponse(message="Interview deleted")


@audio_router.get("/{artifact_id}")
async def get_audio_artifact(
    artifact_id: uuid.UUID,
    auth: CurrentAuth = Depends(get_current_auth),
) -> Response:
    del artifact_id, auth
    raise NotFoundError("Audio artifact not found or expired")
