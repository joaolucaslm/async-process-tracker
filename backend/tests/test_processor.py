from __future__ import annotations

import asyncio
import time

import pytest
from httpx import AsyncClient

from app.config import settings
from app.schemas.request import Status
from app.services.processor import process_request
from app.storage.memory_store import MemoryStore

OBSERVABLE_DELAY = 0.2


@pytest.fixture
def slow_delays(monkeypatch: pytest.MonkeyPatch) -> float:
    monkeypatch.setattr(settings, "validation_delay", OBSERVABLE_DELAY)
    monkeypatch.setattr(settings, "calculation_delay", OBSERVABLE_DELAY)
    return OBSERVABLE_DELAY


async def test_status_and_progress_move_through_the_steps(
    store: MemoryStore, slow_delays: float
) -> None:
    record = await store.create([10, 20, 5])
    task = asyncio.create_task(process_request(record.id, store))

    await asyncio.sleep(slow_delays / 2)
    during_validation = await store.get(record.id)
    assert during_validation is not None
    assert during_validation.status is Status.PROCESSING
    assert during_validation.progress == 0

    await asyncio.sleep(slow_delays)
    during_calculation = await store.get(record.id)
    assert during_calculation is not None
    assert during_calculation.progress == 30
    assert during_calculation.result is None

    await task
    final = await store.get(record.id)
    assert final is not None
    assert final.status is Status.COMPLETED
    assert final.progress == 100
    assert final.result == 35


async def test_the_api_answers_while_a_request_is_processing(
    client: AsyncClient, store: MemoryStore, slow_delays: float
) -> None:
    """The point of the whole exercise: the sleeps must not block the API."""
    record = await store.create([1, 2, 3])
    task = asyncio.create_task(process_request(record.id, store))
    await asyncio.sleep(slow_delays / 4)  # let the routine reach its first sleep

    started = time.perf_counter()
    response = await client.get(f"/requests/{record.id}")
    elapsed = time.perf_counter() - started

    assert response.status_code == 200
    assert response.json()["status"] == "processing"
    assert elapsed < slow_delays / 2, "the API waited for the background sleep"

    # And a brand new request is accepted while the first one is still running.
    accepted = await client.post("/requests", json={"numbers": [7]})
    assert accepted.status_code == 202

    await task


async def test_cancelling_stops_the_routine_where_it_is(
    store: MemoryStore, slow_delays: float
) -> None:
    record = await store.create([1, 2, 3])
    task = asyncio.create_task(process_request(record.id, store))
    await asyncio.sleep(slow_delays / 4)

    cancelled, changed = await store.cancel(record.id, log="Cancelled by the user.")
    assert changed
    assert cancelled is not None

    started = time.perf_counter()
    await asyncio.wait_for(task, timeout=slow_delays)
    assert time.perf_counter() - started < slow_delays / 2, "cancel waited for the sleep"

    final = await store.get(record.id)
    assert final is not None
    assert final.status is Status.CANCELLED
    assert final.result is None
    assert final.progress == 0
    assert final.logs[-1] == "Cancelled by the user."


async def test_a_cancelled_request_is_never_written_again(store: MemoryStore) -> None:
    record = await store.create([1])
    await store.cancel(record.id, log="Cancelled by the user.")

    await store.update(record.id, status=Status.COMPLETED, progress=100, result=1)

    final = await store.get(record.id)
    assert final is not None
    assert final.status is Status.CANCELLED
    assert final.progress == 0
    assert final.result is None


async def test_invalid_stored_numbers_end_in_the_error_status(store: MemoryStore) -> None:
    record = await store.create([float("nan")])

    await process_request(record.id, store)

    final = await store.get(record.id)
    assert final is not None
    assert final.status is Status.ERROR
    assert final.result is None
    assert "finite number" in final.logs[-1]


async def test_processing_an_unknown_request_does_nothing(store: MemoryStore) -> None:
    await process_request("does-not-exist", store)

    assert await store.get("does-not-exist") is None
