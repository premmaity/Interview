import asyncio
import json
import random
from pathlib import Path
from typing import Any, cast

import httpx

from app.integrations.ai import EvaluationContract, QuestionContract
from app.models.entities import Difficulty, RoundType

PROMPT_DIR = Path(__file__).resolve().parents[1] / "prompts"


class GroqAIProvider:
    def __init__(self, *, api_key: str, model: str, timeout_seconds: float) -> None:
        self.model_name = model
        self._api_key = api_key
        self._client = httpx.AsyncClient(
            base_url="https://api.groq.com/openai/v1",
            timeout=httpx.Timeout(timeout_seconds),
            headers={"Authorization": f"Bearer {api_key}"},
            limits=httpx.Limits(max_connections=20, max_keepalive_connections=10),
        )

    async def _json_completion(
        self, *, prompt_name: str, payload: dict[str, Any]
    ) -> dict[str, Any]:
        system_prompt = (PROMPT_DIR / prompt_name).read_text(encoding="utf-8")
        request = {
            "model": self.model_name,
            "temperature": 0.2,
            "max_completion_tokens": 1400,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": "UNTRUSTED_DATA_START\n"
                    + json.dumps(payload, ensure_ascii=False)
                    + "\nUNTRUSTED_DATA_END",
                },
            ],
        }
        for attempt in range(3):
            try:
                response = await self._client.post("/chat/completions", json=request)
                if response.status_code in {429, 500, 502, 503, 504} and attempt < 2:
                    await asyncio.sleep((2**attempt) * 0.25 + random.random() * 0.2)  # noqa: S311
                    continue
                response.raise_for_status()
                content = response.json()["choices"][0]["message"]["content"]
                return cast(dict[str, Any], json.loads(content))
            except (httpx.TimeoutException, httpx.NetworkError):
                if attempt >= 2:
                    raise RuntimeError("AI provider request failed") from None
                await asyncio.sleep((2**attempt) * 0.25 + random.random() * 0.2)  # noqa: S311
        raise RuntimeError("AI provider request failed")

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
        data = await self._json_completion(
            prompt_name="question-v1.md",
            payload={
                "target_role": target_role,
                "seniority": seniority,
                "round_type": round_type.value,
                "difficulty": difficulty.value,
                "sequence": sequence,
                "prior_questions": prior_questions,
                "custom_focus": custom_focus,
                "schema": QuestionContract.model_json_schema(),
            },
        )
        return QuestionContract.model_validate(data)

    async def evaluate_answer(
        self,
        *,
        question: QuestionContract,
        answer: str,
        target_role: str,
        seniority: str,
    ) -> EvaluationContract:
        data = await self._json_completion(
            prompt_name="evaluation-v1.md",
            payload={
                "target_role": target_role,
                "seniority": seniority,
                "question": question.model_dump(mode="json"),
                "answer": answer,
                "schema": EvaluationContract.model_json_schema(),
            },
        )
        return EvaluationContract.model_validate(data)


class GroqSpeechToTextProvider:
    def __init__(self, *, api_key: str, timeout_seconds: float) -> None:
        self._api_key = api_key
        self._timeout = timeout_seconds

    async def transcribe(self, *, data: bytes, media_type: str, language: str) -> str:
        extension = {
            "audio/webm": "webm",
            "audio/ogg": "ogg",
            "audio/mp4": "m4a",
            "audio/mpeg": "mp3",
            "audio/wav": "wav",
        }.get(media_type, "webm")
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            response = await client.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {self._api_key}"},
                data={"model": "whisper-large-v3-turbo", "language": language},
                files={"file": (f"recording.{extension}", data, media_type)},
            )
            response.raise_for_status()
            transcript = str(response.json().get("text", "")).strip()
            if not transcript:
                raise RuntimeError("Transcription provider returned no text")
            return transcript
