from app.integrations.ai import EvaluationContract, QuestionContract
from app.models.entities import Difficulty, RoundType

QUESTION_BANK: dict[RoundType, tuple[tuple[str, list[str], list[str]], ...]] = {
    RoundType.TECHNICAL: (
        (
            "Explain a production issue you diagnosed and how you narrowed down its root cause.",
            ["debugging", "observability"],
            ["hypothesis", "evidence", "trade-off", "result"],
        ),
        (
            "How would you make an API endpoint safe when the client retries the same request?",
            ["idempotency", "api-design"],
            ["idempotency key", "unique constraint", "transaction", "response replay"],
        ),
        (
            "Describe how you would find and remove an N+1 database query.",
            ["databases", "performance"],
            ["measurement", "query plan", "eager loading", "regression test"],
        ),
        (
            "When would you choose a queue instead of doing work inside an HTTP request?",
            ["queues", "reliability"],
            ["latency", "retry", "idempotency", "failure visibility"],
        ),
        (
            "How would you roll out a risky schema migration without downtime?",
            ["migrations", "operations"],
            ["expand contract", "backfill", "compatibility", "rollback"],
        ),
    ),
    RoundType.BEHAVIORAL: (
        (
            "Tell me about a time you changed your approach after receiving difficult feedback.",
            ["growth", "communication"],
            ["situation", "feedback", "action", "result"],
        ),
        (
            "Describe a disagreement with a teammate and how you reached a decision.",
            ["collaboration", "conflict"],
            ["context", "perspectives", "decision", "relationship"],
        ),
        (
            "Tell me about a commitment you missed and what you did next.",
            ["ownership", "planning"],
            ["accountability", "communication", "recovery", "learning"],
        ),
    ),
    RoundType.SYSTEM_DESIGN: (
        (
            "Design an interview-practice service for 200 concurrent live sessions.",
            ["capacity", "architecture"],
            ["requirements", "data model", "bottlenecks", "failure modes"],
        ),
        (
            "Design a notification pipeline that tolerates provider outages and duplicate delivery.",
            ["queues", "delivery"],
            ["outbox", "retry", "deduplication", "dead-letter"],
        ),
    ),
}


class FakeAIProvider:
    model_name = "deterministic-fake-v1"

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
    ) -> QuestionContract:
        selected_round = round_type
        if round_type in {RoundType.MIXED, RoundType.CUSTOM}:
            rounds = (RoundType.TECHNICAL, RoundType.BEHAVIORAL, RoundType.SYSTEM_DESIGN)
            selected_round = rounds[(sequence - 1) % len(rounds)]
        bank = QUESTION_BANK[selected_round]
        text, tags, coverage = bank[(sequence - 1) % len(bank)]
        if custom_focus:
            text = f"With a focus on {custom_focus[:120]}, {text[0].lower()}{text[1:]}"
        return QuestionContract(
            text=text,
            question_type=selected_round,
            difficulty=difficulty,
            rubric_tags=tags,
            expected_coverage=coverage,
            follow_up_intent=f"Assess {seniority} {target_role} reasoning",
        )

    async def evaluate_answer(
        self,
        *,
        question: QuestionContract,
        answer: str,
        target_role: str,
        seniority: str,
    ) -> EvaluationContract:
        normalized = answer.casefold()
        coverage_hits = [
            item for item in question.expected_coverage if item.casefold() in normalized
        ]
        detail_score = min(30.0, len(answer.split()) / 2)
        coverage_score = 50.0 * len(coverage_hits) / len(question.expected_coverage)
        structure_score = 20.0 if len(answer.split()) >= 35 else 10.0
        total = round(min(100.0, detail_score + coverage_score + structure_score), 1)
        evidence = [f"The answer explicitly covered '{item}'." for item in coverage_hits]
        if not evidence:
            evidence = ["The answer did not explicitly mention the rubric concepts."]
        missing = [item for item in question.expected_coverage if item not in coverage_hits]
        confidence = 0.85 if len(answer.split()) >= 20 else 0.55
        return EvaluationContract(
            overall_score=total,
            category_scores={
                "clarity": round(min(100.0, detail_score * 2.5), 1),
                "coverage": round(coverage_score * 2, 1),
                "structure": 80.0 if structure_score == 20 else 45.0,
            },
            evidence=evidence,
            strengths=["Used concrete detail"]
            if len(answer.split()) >= 20
            else ["Answered directly"],
            gaps=[f"Did not clearly address {item}" for item in missing]
            or ["No major rubric gap detected"],
            improvement_advice=[
                "Use a concise context-action-result structure.",
                "Name the evidence or metric that supports the outcome.",
            ],
            suggested_answer=(
                f"For a {seniority} {target_role} answer, outline the context, explain the decision, "
                f"cover {', '.join(question.expected_coverage)}, and close with a measurable result."
            ),
            confidence=confidence,
        )


class FakeSpeechToTextProvider:
    async def transcribe(self, *, data: bytes, media_type: str, language: str) -> str:
        del media_type, language
        if not data:
            raise ValueError("empty audio")
        return "Editable local-development transcript. Replace this text before submitting."
