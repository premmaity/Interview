import base64
import json
import uuid
from datetime import UTC, datetime

from redis.asyncio import Redis
from sqlalchemy import Select, and_, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import Settings
from app.core.errors import ConflictError, NotFoundError
from app.domains.interviews.state_machine import InvalidTransition, transition
from app.integrations.ai import AIProvider, QuestionContract
from app.models.entities import (
    Evaluation,
    InterviewAnswer,
    InterviewQuestion,
    InterviewSession,
    InterviewStatus,
    User,
)
from app.schemas.interviews import AnswerSubmit, InterviewCreate


class InterviewService:
    def __init__(self, db: AsyncSession, settings: Settings, ai: AIProvider) -> None:
        self.db = db
        self.settings = settings
        self.ai = ai

    def _owned_query(self, user: User, session_id: uuid.UUID) -> Select[InterviewSession]:
        return (
            select(InterviewSession)
            .where(
                InterviewSession.id == session_id,
                InterviewSession.user_id == user.id,
            )
            .options(
                selectinload(InterviewSession.questions).selectinload(InterviewQuestion.answer),
                selectinload(InterviewSession.evaluations),
            )
            .execution_options(populate_existing=True)
        )

    async def create(self, user: User, payload: InterviewCreate) -> InterviewSession:
        if payload.question_count > self.settings.max_questions_per_session:
            raise ConflictError("Question count exceeds the configured limit")
        session = InterviewSession(
            user_id=user.id,
            status=InterviewStatus.CREATED,
            target_role=payload.target_role,
            seniority=payload.seniority,
            round_type=payload.round_type,
            difficulty=payload.difficulty,
            input_mode=payload.input_mode,
            question_count=payload.question_count,
            current_question_number=0,
            model_version=self.ai.model_name,
            config_snapshot=payload.model_dump(mode="json"),
        )
        self.db.add(session)
        await self.db.commit()
        return await self.get(user, session.id)

    async def get(self, user: User, session_id: uuid.UUID) -> InterviewSession:
        session = await self.db.scalar(self._owned_query(user, session_id))
        if session is None:
            raise NotFoundError("Interview not found")
        return session

    async def list(
        self, user: User, *, limit: int, cursor: str | None
    ) -> tuple[list[InterviewSession], str | None]:
        query = (
            select(InterviewSession)
            .where(InterviewSession.user_id == user.id)
            .options(
                selectinload(InterviewSession.questions).selectinload(InterviewQuestion.answer)
            )
            .order_by(desc(InterviewSession.created_at), desc(InterviewSession.id))
            .limit(limit + 1)
        )
        if cursor:
            try:
                created_text, id_text = (
                    base64.urlsafe_b64decode(cursor.encode()).decode().split("|", 1)
                )
                created_at = datetime.fromisoformat(created_text)
                cursor_id = uuid.UUID(id_text)
            except (ValueError, UnicodeDecodeError) as error:
                raise ConflictError("Invalid pagination cursor") from error
            query = query.where(
                (InterviewSession.created_at < created_at)
                | and_(InterviewSession.created_at == created_at, InterviewSession.id < cursor_id)
            )
        rows = list((await self.db.scalars(query)).unique().all())
        next_cursor = None
        if len(rows) > limit:
            last = rows[limit - 1]
            token = f"{last.created_at.isoformat()}|{last.id}".encode()
            next_cursor = base64.urlsafe_b64encode(token).decode()
            rows = rows[:limit]
        return rows, next_cursor

    async def start(self, user: User, session_id: uuid.UUID) -> InterviewSession:
        session = await self.db.scalar(self._owned_query(user, session_id).with_for_update())
        if session is None:
            raise NotFoundError("Interview not found")
        if session.status == InterviewStatus.ACTIVE:
            return session
        try:
            session.status = transition(session.status, InterviewStatus.ACTIVE)
        except InvalidTransition as error:
            raise ConflictError(str(error)) from error
        question = await self._generate_question(session, 1)
        self.db.add(question)
        session.current_question_number = 1
        session.started_at = datetime.now(UTC)
        session.version += 1
        await self.db.commit()
        return await self.get(user, session_id)

    async def submit_answer(
        self, user: User, session_id: uuid.UUID, payload: AnswerSubmit
    ) -> InterviewSession:
        existing = await self.db.scalar(
            select(InterviewAnswer).where(
                InterviewAnswer.session_id == session_id,
                InterviewAnswer.client_request_id == payload.client_request_id,
            )
        )
        if existing is not None:
            return await self.get(user, session_id)

        session = await self.db.scalar(self._owned_query(user, session_id).with_for_update())
        if session is None:
            raise NotFoundError("Interview not found")
        if session.status != InterviewStatus.ACTIVE:
            raise ConflictError("Interview is not accepting answers")
        current = next(
            (
                question
                for question in session.questions
                if question.sequence == session.current_question_number
            ),
            None,
        )
        if current is None or current.id != payload.question_id:
            raise ConflictError("Answer does not match the current question")
        if current.answer is not None:
            raise ConflictError("The current question already has an answer")

        answer = InterviewAnswer(
            session_id=session.id,
            question_id=current.id,
            client_request_id=payload.client_request_id,
            text=payload.text.strip(),
            source_mode=payload.source_mode,
            duration_seconds=payload.duration_seconds,
            submitted_at=datetime.now(UTC),
        )
        self.db.add(answer)
        await self.db.flush()

        if session.current_question_number >= session.question_count:
            session.status = transition(session.status, InterviewStatus.EVALUATING)
        else:
            next_sequence = session.current_question_number + 1
            self.db.add(await self._generate_question(session, next_sequence))
            session.current_question_number = next_sequence
        session.version += 1
        await self.db.commit()

        if (
            session.status == InterviewStatus.EVALUATING
            and self.settings.evaluation_dispatch == "inline"
        ):
            await self.evaluate(user, session.id)
        elif session.status == InterviewStatus.EVALUATING:
            redis = Redis.from_url(self.settings.redis_url, decode_responses=True)
            try:
                await redis.lpush(
                    "interview:evaluation:jobs",
                    json.dumps({"session_id": str(session.id), "attempt": 0}),
                )
            finally:
                await redis.aclose()
        return await self.get(user, session.id)

    async def complete(self, user: User, session_id: uuid.UUID) -> InterviewSession:
        session = await self.get(user, session_id)
        if session.status == InterviewStatus.COMPLETED:
            return session
        if session.status == InterviewStatus.ACTIVE:
            answered = sum(question.answer is not None for question in session.questions)
            if answered == 0:
                raise ConflictError("Submit at least one answer before completing")
            session.status = transition(session.status, InterviewStatus.EVALUATING)
            await self.db.commit()
        if session.status == InterviewStatus.EVALUATING:
            await self.evaluate(user, session.id)
        return await self.get(user, session.id)

    async def evaluate(self, user: User, session_id: uuid.UUID) -> InterviewSession:
        session = await self.get(user, session_id)
        if session.status == InterviewStatus.COMPLETED:
            return session
        if session.status != InterviewStatus.EVALUATING:
            raise ConflictError("Interview is not ready for evaluation")
        if session.evaluations:
            session.status = transition(session.status, InterviewStatus.COMPLETED)
            session.completed_at = datetime.now(UTC)
            await self.db.commit()
            return await self.get(user, session_id)

        answer_evaluations: list[Evaluation] = []
        for question in session.questions:
            if question.answer is None:
                continue
            contract = QuestionContract(
                text=question.text,
                question_type=question.question_type,
                difficulty=session.difficulty,
                rubric_tags=question.rubric_tags,
                expected_coverage=question.expected_coverage,
            )
            result = await self.ai.evaluate_answer(
                question=contract,
                answer=question.answer.text,
                target_role=session.target_role,
                seniority=session.seniority,
            )
            evaluation = Evaluation(
                session_id=session.id,
                answer_id=question.answer.id,
                model_version=self.ai.model_name,
                prompt_version="evaluation-v1",
                **result.model_dump(),
            )
            self.db.add(evaluation)
            answer_evaluations.append(evaluation)
        if not answer_evaluations:
            raise ConflictError("Interview has no answers to evaluate")
        await self.db.flush()
        overall = sum(item.overall_score for item in answer_evaluations) / len(answer_evaluations)
        category_names = {name for item in answer_evaluations for name in item.category_scores}
        category_scores = {
            name: round(
                sum(item.category_scores.get(name, 0) for item in answer_evaluations)
                / len(answer_evaluations),
                1,
            )
            for name in category_names
        }
        self.db.add(
            Evaluation(
                session_id=session.id,
                answer_id=None,
                overall_score=round(overall, 1),
                category_scores=category_scores,
                evidence=["Aggregate of answer-level evidence"],
                strengths=list(
                    dict.fromkeys(x for item in answer_evaluations for x in item.strengths)
                )[:5],
                gaps=list(dict.fromkeys(x for item in answer_evaluations for x in item.gaps))[:5],
                improvement_advice=[
                    "Practice one weak rubric topic per day.",
                    "Record a two-minute answer and revise it for clarity.",
                ],
                suggested_answer="Use the answer-level outlines as the basis for the next practice round.",
                confidence=round(
                    sum(item.confidence for item in answer_evaluations) / len(answer_evaluations), 2
                ),
                model_version=self.ai.model_name,
                prompt_version="report-v1",
            )
        )
        session.status = transition(session.status, InterviewStatus.COMPLETED)
        session.completed_at = datetime.now(UTC)
        session.version += 1
        await self.db.commit()
        return await self.get(user, session_id)

    async def delete(self, user: User, session_id: uuid.UUID) -> None:
        session = await self.get(user, session_id)
        await self.db.delete(session)
        await self.db.commit()

    async def _generate_question(
        self, session: InterviewSession, sequence: int
    ) -> InterviewQuestion:
        prior = [question.text for question in session.questions]
        contract = await self.ai.generate_question(
            target_role=session.target_role,
            seniority=session.seniority,
            round_type=session.round_type,
            difficulty=session.difficulty,
            sequence=sequence,
            prior_questions=prior[-8:],
            custom_focus=session.config_snapshot.get("custom_focus"),
        )
        return InterviewQuestion(
            session_id=session.id,
            sequence=sequence,
            question_type=contract.question_type,
            text=contract.text,
            rubric_tags=contract.rubric_tags,
            expected_coverage=contract.expected_coverage,
            generated_metadata={
                "difficulty": contract.difficulty.value,
                "follow_up_intent": contract.follow_up_intent,
            },
        )


async def dashboard_counts(db: AsyncSession, user: User) -> dict[str, int]:
    rows = await db.execute(
        select(InterviewSession.status, func.count())
        .where(InterviewSession.user_id == user.id)
        .group_by(InterviewSession.status)
    )
    return {status.value: count for status, count in rows.all()}
