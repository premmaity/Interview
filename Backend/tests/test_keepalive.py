import asyncio
import uuid

import httpx
import pytest
from httpx import AsyncClient

from app.core.errors import ConflictError
from app.services import keepalive as keepalive_module
from app.services.keepalive import normalize_render_url, run_keepalive_cycle
from tests.conftest import register_and_login


@pytest.mark.parametrize(
    "value",
    [
        "http://demo.onrender.com",
        "https://onrender.com",
        "https://demo.onrender.com.evil.example",
        "https://user:pass@demo.onrender.com",
        "https://demo.onrender.com:443",
        "https://demo.onrender.com/health?secret=value",
        "not-a-url",
    ],
)
def test_normalize_render_url_rejects_unsafe_targets(value: str) -> None:
    with pytest.raises(ConflictError):
        normalize_render_url(value)


def test_normalize_render_url_canonicalizes_valid_target() -> None:
    assert (
        normalize_render_url("  https://My-API.onrender.com/health/live/  ")
        == "https://my-api.onrender.com/health/live"
    )


@pytest.mark.asyncio
async def test_keepalive_project_crud_is_private_and_csrf_protected(client: AsyncClient) -> None:
    csrf = await register_and_login(client)
    headers = {"X-CSRF-Token": csrf}

    invalid = await client.post(
        "/api/v1/keepalive-projects",
        json={"name": "Unsafe", "url": "http://localhost:8000/health"},
        headers=headers,
    )
    assert invalid.status_code == 409
    blank_name = await client.post(
        "/api/v1/keepalive-projects",
        json={"name": "   ", "url": "https://safe.onrender.com/"},
        headers=headers,
    )
    assert blank_name.status_code == 409

    created = await client.post(
        "/api/v1/keepalive-projects",
        json={"name": "Portfolio API", "url": "https://portfolio-api.onrender.com/health/live"},
        headers=headers,
    )
    assert created.status_code == 201, created.text
    project = created.json()
    assert project["enabled"] is False

    duplicate = await client.post(
        "/api/v1/keepalive-projects",
        json={"name": "Duplicate", "url": project["url"]},
        headers=headers,
    )
    assert duplicate.status_code == 409

    enabled = await client.patch(
        f"/api/v1/keepalive-projects/{project['id']}",
        json={"enabled": True},
        headers=headers,
    )
    assert enabled.status_code == 200
    assert enabled.json()["enabled"] is True

    listed = await client.get("/api/v1/keepalive-projects")
    assert listed.status_code == 200
    assert [item["name"] for item in listed.json()["items"]] == ["Portfolio API"]

    second_csrf = await register_and_login(
        client, email="second@example.com", username="second-candidate"
    )
    hidden = await client.get("/api/v1/keepalive-projects")
    assert hidden.json()["items"] == []
    forbidden = await client.patch(
        f"/api/v1/keepalive-projects/{project['id']}",
        json={"enabled": False},
        headers={"X-CSRF-Token": second_csrf},
    )
    assert forbidden.status_code == 404

    missing = await client.delete(
        f"/api/v1/keepalive-projects/{uuid.uuid4()}",
        headers={"X-CSRF-Token": second_csrf},
    )
    assert missing.status_code == 404


@pytest.mark.asyncio
async def test_keepalive_cycle_records_ping_result(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    csrf = await register_and_login(client)
    headers = {"X-CSRF-Token": csrf}
    created = await client.post(
        "/api/v1/keepalive-projects",
        json={"name": "Demo", "url": "https://demo.onrender.com/health/live"},
        headers=headers,
    )
    project_id = created.json()["id"]
    await client.patch(
        f"/api/v1/keepalive-projects/{project_id}",
        json={"enabled": True},
        headers=headers,
    )

    real_client = httpx.AsyncClient
    transport = httpx.MockTransport(lambda request: httpx.Response(204, request=request))

    def test_client(**kwargs: object) -> httpx.AsyncClient:
        kwargs.pop("follow_redirects", None)
        kwargs.pop("headers", None)
        kwargs.pop("timeout", None)
        return real_client(transport=transport, **kwargs)

    monkeypatch.setattr(keepalive_module.httpx, "AsyncClient", test_client)
    assert await run_keepalive_cycle() == 1

    listed = await client.get("/api/v1/keepalive-projects")
    project = listed.json()["items"][0]
    assert project["last_status_code"] == 204
    assert project["last_ping_at"] is not None
    assert project["last_error"] is None

    deleted = await client.delete(
        f"/api/v1/keepalive-projects/{project_id}", headers=headers
    )
    assert deleted.status_code == 204
    assert await run_keepalive_cycle() == 0


@pytest.mark.asyncio
async def test_keepalive_cycle_tolerates_project_deletion_during_ping(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    csrf = await register_and_login(client)
    headers = {"X-CSRF-Token": csrf}
    created = await client.post(
        "/api/v1/keepalive-projects",
        json={"name": "Temporary", "url": "https://temporary.onrender.com/"},
        headers=headers,
    )
    project_id = created.json()["id"]
    await client.patch(
        f"/api/v1/keepalive-projects/{project_id}",
        json={"enabled": True},
        headers=headers,
    )

    started = asyncio.Event()
    release = asyncio.Event()

    async def delayed_ping(
        client_instance: httpx.AsyncClient, target_url: str
    ) -> tuple[int | None, str | None]:
        del client_instance, target_url
        started.set()
        await release.wait()
        return 200, None

    monkeypatch.setattr(keepalive_module, "_ping", delayed_ping)
    cycle = asyncio.create_task(run_keepalive_cycle())
    await started.wait()
    deleted = await client.delete(
        f"/api/v1/keepalive-projects/{project_id}", headers=headers
    )
    assert deleted.status_code == 204
    release.set()
    assert await cycle == 1
