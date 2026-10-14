import uuid

import pytest
from httpx import AsyncClient

from tests.conftest import register_and_login


def csrf(token: str) -> dict[str, str]:
    return {"X-CSRF-Token": token}


@pytest.mark.asyncio
async def test_full_text_interview_workflow_is_durable_and_idempotent(client: AsyncClient) -> None:
    token = await register_and_login(client)
    me = await client.get("/api/v1/auth/me")
    assert me.status_code == 200
    profile = await client.put(
        "/api/v1/profile",
        headers=csrf(token),
        json={
            "target_role": "Backend engineer",
            "seniority": "senior",
            "years_experience": 7,
            "skills": ["Python", "PostgreSQL"],
            "preferred_language": "English",
            "job_description": None,
        },
    )
    assert profile.status_code == 200

    created = await client.post(
        "/api/v1/interviews",
        headers=csrf(token),
        json={
            "target_role": "Backend engineer",
            "seniority": "senior",
            "round_type": "technical",
            "difficulty": "hard",
            "question_count": 2,
            "input_mode": "text",
        },
    )
    assert created.status_code == 201, created.text
    session_id = created.json()["id"]
    started = await client.post(f"/api/v1/interviews/{session_id}/start", headers=csrf(token))
    assert started.status_code == 200
    first_question = started.json()["current_question"]

    payload = {
        "question_id": first_question["id"],
        "client_request_id": str(uuid.uuid4()),
        "text": "I form a hypothesis, inspect traces and logs as evidence, test the trade-off, and verify the result.",
        "source_mode": "text",
    }
    first = await client.post(
        f"/api/v1/interviews/{session_id}/answers", headers=csrf(token), json=payload
    )
    assert first.status_code == 200
    assert first.json()["current_question_number"] == 2
    duplicate = await client.post(
        f"/api/v1/interviews/{session_id}/answers", headers=csrf(token), json=payload
    )
    assert duplicate.status_code == 200
    assert len(duplicate.json()["answers"]) == 1

    second_question = first.json()["current_question"]
    final = await client.post(
        f"/api/v1/interviews/{session_id}/answers",
        headers=csrf(token),
        json={
            "question_id": second_question["id"],
            "client_request_id": str(uuid.uuid4()),
            "text": "I use an idempotency key, unique constraint, transaction, and response replay.",
            "source_mode": "text",
        },
    )
    assert final.status_code == 200, final.text
    assert final.json()["status"] == "completed"
    report = await client.get(f"/api/v1/interviews/{session_id}/report")
    assert report.status_code == 200
    assert len(report.json()["answer_feedback"]) == 2
    assert report.json()["disclaimer"].startswith("Scores are coaching feedback")

    history = await client.get("/api/v1/interviews")
    assert history.json()["items"][0]["id"] == session_id
    deleted = await client.delete(f"/api/v1/interviews/{session_id}", headers=csrf(token))
    assert deleted.status_code == 200
    assert (await client.get(f"/api/v1/interviews/{session_id}")).status_code == 404


@pytest.mark.asyncio
async def test_csrf_and_horizontal_authorization_are_enforced(client: AsyncClient) -> None:
    first_token = await register_and_login(client, email="one@example.com", username="one")
    created = await client.post(
        "/api/v1/interviews",
        headers=csrf(first_token),
        json={
            "target_role": "Engineer",
            "seniority": "mid",
            "round_type": "behavioral",
            "difficulty": "medium",
            "question_count": 1,
            "input_mode": "text",
        },
    )
    session_id = created.json()["id"]
    assert (await client.post(f"/api/v1/interviews/{session_id}/start")).status_code == 403
    await client.post("/api/v1/auth/logout", headers=csrf(first_token))
    await register_and_login(client, email="two@example.com", username="two")
    assert (await client.get(f"/api/v1/interviews/{session_id}")).status_code == 404


@pytest.mark.asyncio
async def test_generic_login_and_recovery_responses(client: AsyncClient) -> None:
    failed = await client.post(
        "/api/v1/auth/login", json={"email": "missing@example.com", "password": "wrong"}
    )
    assert failed.status_code == 401
    assert failed.json()["error"]["message"] == "Invalid email or password"
    recovery = await client.post(
        "/api/v1/auth/recovery/request", json={"email": "missing@example.com"}
    )
    assert recovery.status_code == 202


@pytest.mark.asyncio
async def test_csrf_bootstrap_requires_exact_origin_and_rotates_token(
    client: AsyncClient,
) -> None:
    original = await register_and_login(client)
    rejected = await client.post("/api/v1/auth/csrf")
    assert rejected.status_code == 403

    rotated = await client.post("/api/v1/auth/csrf", headers={"Origin": "http://localhost:5173"})
    assert rotated.status_code == 200
    new_token = rotated.json()["csrf_token"]
    assert new_token != original
    assert (await client.post("/api/v1/auth/logout", headers=csrf(original))).status_code == 403
    assert (await client.post("/api/v1/auth/logout", headers=csrf(new_token))).status_code == 200


@pytest.mark.asyncio
async def test_registration_validation_and_duplicate_account_are_generic(
    client: AsyncClient,
) -> None:
    weak = await client.post(
        "/api/v1/auth/register",
        json={"email": "weak@example.com", "username": "weak", "password": "alllowercaseonly"},
    )
    assert weak.status_code == 409
    await register_and_login(client)
    duplicate = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "candidate@example.com",
            "username": "someone-else",
            "password": "Correct-Horse-42",
        },
    )
    assert duplicate.status_code == 409
    assert "details" in duplicate.json()["error"]["message"]


@pytest.mark.asyncio
async def test_account_deletion_requires_reauthentication_and_cascades(
    client: AsyncClient,
) -> None:
    token = await register_and_login(client)
    rejected = await client.request(
        "DELETE",
        "/api/v1/auth/me",
        headers=csrf(token),
        json={"password": "wrong", "confirmation": "DELETE MY ACCOUNT"},
    )
    assert rejected.status_code == 401
    deleted = await client.request(
        "DELETE",
        "/api/v1/auth/me",
        headers=csrf(token),
        json={"password": "Correct-Horse-42", "confirmation": "DELETE MY ACCOUNT"},
    )
    assert deleted.status_code == 200
    assert (await client.get("/api/v1/auth/me")).status_code == 401


@pytest.mark.asyncio
async def test_transcription_requires_consent_and_supported_mime(client: AsyncClient) -> None:
    token = await register_and_login(client)
    created = await client.post(
        "/api/v1/interviews",
        headers=csrf(token),
        json={
            "target_role": "Engineer",
            "seniority": "mid",
            "round_type": "technical",
            "difficulty": "easy",
            "question_count": 1,
            "input_mode": "voice",
        },
    )
    session_id = created.json()["id"]
    rejected = await client.post(
        f"/api/v1/interviews/{session_id}/transcriptions",
        headers=csrf(token),
        data={"consent": "false", "language": "en"},
        files={"file": ("answer.webm", b"audio", "audio/webm")},
    )
    assert rejected.status_code == 409
    accepted = await client.post(
        f"/api/v1/interviews/{session_id}/transcriptions",
        headers=csrf(token),
        data={"consent": "true", "language": "en"},
        files={"file": ("answer.webm", b"audio", "audio/webm")},
    )
    assert accepted.status_code == 200
    assert accepted.json()["retained"] is False
