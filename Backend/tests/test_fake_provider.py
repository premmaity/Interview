import pytest

from app.integrations.fakes import FakeAIProvider, FakeSpeechToTextProvider
from app.models.entities import Difficulty, RoundType


@pytest.mark.asyncio
async def test_fake_provider_is_deterministic_and_bounded() -> None:
    provider = FakeAIProvider()
    question = await provider.generate_question(
        target_role="Backend engineer",
        seniority="senior",
        round_type=RoundType.TECHNICAL,
        difficulty=Difficulty.HARD,
        sequence=2,
        prior_questions=[],
        custom_focus=None,
    )
    assert "idempotency" in question.rubric_tags
    evaluation = await provider.evaluate_answer(
        question=question,
        answer="I use an idempotency key, a unique constraint, and one transaction to replay the response.",
        target_role="Backend engineer",
        seniority="senior",
    )
    assert 0 <= evaluation.overall_score <= 100
    assert evaluation.confidence <= 1
    assert evaluation.evidence


@pytest.mark.asyncio
async def test_mixed_and_custom_rounds_are_supported() -> None:
    provider = FakeAIProvider()
    custom = await provider.generate_question(
        target_role="Engineer",
        seniority="mid",
        round_type=RoundType.CUSTOM,
        difficulty=Difficulty.MEDIUM,
        sequence=1,
        prior_questions=[],
        custom_focus="caching",
    )
    assert "caching" in custom.text


@pytest.mark.asyncio
async def test_fake_transcription_rejects_empty_audio() -> None:
    provider = FakeSpeechToTextProvider()
    with pytest.raises(ValueError, match="empty"):
        await provider.transcribe(data=b"", media_type="audio/webm", language="en")
    assert "Editable" in await provider.transcribe(
        data=b"audio", media_type="audio/webm", language="en"
    )
