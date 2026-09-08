from __future__ import annotations

from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.config import settings
from app.main import app
from app.storage.memory_store import MemoryStore, get_store

TEST_DELAY = 0.02


@pytest.fixture(autouse=True)
def fast_delays(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "validation_delay", TEST_DELAY)
    monkeypatch.setattr(settings, "calculation_delay", TEST_DELAY)


@pytest.fixture
def store() -> MemoryStore:
    return MemoryStore()


@pytest_asyncio.fixture
async def client(store: MemoryStore) -> AsyncIterator[AsyncClient]:
    app.dependency_overrides[get_store] = lambda: store
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as async_client:
        yield async_client
    app.dependency_overrides.clear()
