import uuid
from datetime import UTC, datetime

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings
from app.core.errors import ConflictError, NotFoundError
from app.core.security import hash_password
from app.db.session import SessionFactory
from app.integrations.fakes import FakeAIProvider
from app.models.entities import (
    Difficulty,
    Evaluation,
    InputMode,
    InterviewStatus,
    RoundType,
    User,
)
from app.schemas.interviews import AnswerSubmit, InterviewCreate
from app.services.interviews import InterviewService, dashboard_counts


def payload(*, count: int = 2) -> InterviewCreate:
    return InterviewCreate(
        target_role="Backend engineer",
        seniority="senior",
        round_type=RoundType.TECHNICAL,
        difficulty=Difficulty.HARD,
        question_count=count,
        input_mode=InputMode.TEXT,
    )


async def make_user(db: AsyncSession) -> User:
    user = User(
        email=f"{uuid.uuid4()}@example.com",
        username=str(uuid.uuid4()),
        password_hash=hash_password("Service-Test-Password-42"),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.mark.asyncio
async def test_pagination_lookup_delete_and_limits() -> None:
    async with SessionFactory() as db:
        user = await make_user(db)
        settings = Settings(max_questions_per_session=2)
        service = InterviewService(db, settings, FakeAIProvider())
        with pytest.raises(ConflictError, match="configured limit"):
            await service.create(user, payload(count=3))
        sessions = [await service.create(user, payload(count=1)) for _ in range(3)]
        first_page, cursor = await service.list(user, limit=2, cursor=None)
        assert len(first_page) == 2
        assert cursor is not None
        second_page, no_cursor = await service.list(user, limit=2, cursor=cursor)
        assert len(second_page) == 1
        assert no_cursor is None
        with pytest.raises(ConflictError, match="cursor"):
            await service.list(user, limit=2, cursor="not-base64")
        assert (await dashboard_counts(db, user))["created"] == 3
        await service.delete(user, sessions[0].id)
        with pytest.raises(NotFoundError):
            await service.get(user, sessions[0].id)
        with pytest.raises(NotFoundError):
            await service.start(user, uuid.uuid4())


@pytest.mark.asyncio
async def test_start_answer_complete_and_conflict_paths() -> None:
    async with SessionFactory() as db:
        user = await make_user(db)
        service = InterviewService(db, Settings(), FakeAIProvider())
        created = await service.create(user, payload())
        started = await service.start(user, created.id)
        assert (await service.start(user, created.id)).status == InterviewStatus.ACTIVE
        question = started.questions[0]
        with pytest.raises(ConflictError, match="current question"):
            await service.submit_answer(
                user,
                created.id,
                AnswerSubmit(
                    question_id=uuid.uuid4(),
                    client_request_id=str(uuid.uuid4()),
                    text="A mismatched answer",
                    source_mode=InputMode.TEXT,
                ),
            )
        with pytest.raises(ConflictError, match="at least one"):
            await service.complete(user, created.id)
        request_id = str(uuid.uuid4())
        answered = await service.submit_answer(
            user,
            created.id,
            AnswerSubmit(
                question_id=question.id,
                client_request_id=request_id,
                text="I use a hypothesis, evidence, an explicit trade-off, and verify the result.",
                source_mode=InputMode.TEXT,
            ),
        )
        replayed = await service.submit_answer(
            user,
            created.id,
            AnswerSubmit(
                question_id=question.id,
                client_request_id=request_id,
                text="This different body is ignored for the same request identifier.",
                source_mode=InputMode.TEXT,
            ),
        )
        assert len(replayed.questions) == len(answered.questions) == 2
        completed = await service.complete(user, created.id)
        assert completed.status == InterviewStatus.COMPLETED
        assert await service.complete(user, created.id) == completed
        assert await service.evaluate(user, created.id) == completed


@pytest.mark.asyncio
async def test_invalid_lifecycle_and_empty_evaluation_are_safe() -> None:
    async with SessionFactory() as db:
        user = await make_user(db)
        service = InterviewService(db, Settings(), FakeAIProvider())
        created = await service.create(user, payload(count=1))
        with pytest.raises(ConflictError, match="not ready"):
            await service.evaluate(user, created.id)
        created.status = InterviewStatus.EVALUATING
        await db.commit()
        with pytest.raises(ConflictError, match="no answers"):
            await service.evaluate(user, created.id)

        invalid_start = await service.create(user, payload(count=1))
        invalid_start.status = InterviewStatus.ABANDONED
        await db.commit()
        with pytest.raises(ConflictError, match="cannot transition"):
            await service.start(user, invalid_start.id)
        with pytest.raises(ConflictError, match="not accepting"):
            await service.submit_answer(
                user,
                invalid_start.id,
                AnswerSubmit(
                    question_id=uuid.uuid4(),
                    client_request_id=str(uuid.uuid4()),
                    text="No longer active",
                    source_mode=InputMode.TEXT,
                ),
            )


@pytest.mark.asyncio
async def test_existing_evaluation_finishes_recovered_job() -> None:
    async with SessionFactory() as db:
        user = await make_user(db)
        service = InterviewService(db, Settings(), FakeAIProvider())
        session = await service.create(user, payload(count=1))
        session.status = InterviewStatus.EVALUATING
        db.add(
            Evaluation(
                session_id=session.id,
                answer_id=None,
                overall_score=50,
                category_scores={},
                evidence=[],
                strengths=[],
                gaps=[],
                improvement_advice=[],
                suggested_answer="Outline",
                confidence=0.5,
                model_version="fake",
                prompt_version="report-v1",
                created_at=datetime.now(UTC),
                updated_at=datetime.now(UTC),
            )
        )
        await db.commit()
        recovered = await service.evaluate(user, session.id)
        assert recovered.status == InterviewStatus.COMPLETED
