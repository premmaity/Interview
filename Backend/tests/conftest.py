import os
from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

os.environ["APP_ENV"] = "test"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./test-interview.db"
os.environ["AI_PROVIDER"] = "fake"
os.environ["EVALUATION_DISPATCH"] = "inline"

from app.api.dependencies import get_rate_limiter  # noqa: E402
from app.core.rate_limit import RateLimiter  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest_asyncio.fixture(autouse=True)
async def database() -> AsyncIterator[None]:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.drop_all)


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest_asyncio.fixture
async def client() -> AsyncIterator[AsyncClient]:
    app.dependency_overrides[get_rate_limiter] = lambda: RateLimiter(None)
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as test_client:
        yield test_client
    app.dependency_overrides.clear()


async def register_and_login(
    client: AsyncClient,
    *,
    email: str = "candidate@example.com",
    username: str = "candidate",
) -> str:
    password = "Correct-Horse-42"
    registered = await client.post(
        "/api/v1/auth/register",
        json={"email": email, "username": username, "password": password},
    )
    assert registered.status_code == 201, registered.text
    logged_in = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert logged_in.status_code == 200, logged_in.text
    return logged_in.json()["csrf_token"]
