from __future__ import annotations

import asyncio
import math

from app.config import settings
from app.schemas.request import Status
from app.storage.memory_store import MemoryStore

LOG_STARTED = "Starting processing..."
LOG_VALIDATING = "Validating data..."
LOG_CALCULATING = "Calculating sum..."
LOG_FINISHED = "Finished successfully."


async def process_request(request_id: str, store: MemoryStore) -> None:
    cancel_event = store.cancel_event(request_id)

    try:
        if cancel_event.is_set():
            return
        await store.update(request_id, status=Status.PROCESSING, progress=0, log=LOG_STARTED)

        if await _sleep_unless_cancelled(settings.validation_delay, cancel_event):
            return
        numbers = await _validated_numbers(request_id, store)
        await store.update(request_id, progress=30, log=LOG_VALIDATING)

        if await _sleep_unless_cancelled(settings.calculation_delay, cancel_event):
            return
        total = float(sum(numbers))
        await store.update(request_id, progress=70, log=LOG_CALCULATING)

        if cancel_event.is_set():
            return
        await store.update(
            request_id,
            status=Status.COMPLETED,
            progress=100,
            result=total,
            log=LOG_FINISHED,
        )
    except Exception as exc: 
        await store.update(request_id, status=Status.ERROR, log=f"Processing failed: {exc}")


async def _validated_numbers(request_id: str, store: MemoryStore) -> list[float]:
    record = await store.get(request_id)
    if record is None:
        raise LookupError(f"request {request_id} no longer exists")
    if not record.numbers:
        raise ValueError("the list of numbers is empty")
    if any(math.isnan(n) or math.isinf(n) for n in record.numbers):
        raise ValueError("the list contains a value that is not a finite number")
    return record.numbers


async def _sleep_unless_cancelled(delay: float, cancel_event: asyncio.Event) -> bool:
    try:
        await asyncio.wait_for(cancel_event.wait(), timeout=delay)
    except (asyncio.TimeoutError, TimeoutError):
        return False
    return True
