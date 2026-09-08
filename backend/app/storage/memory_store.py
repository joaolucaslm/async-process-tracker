from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from datetime import datetime, timezone
from uuid import uuid4

from app.schemas.request import FINAL_STATUSES, Status

INITIAL_LOG = "Request created"


def _now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass
class RequestRecord:

    id: str
    numbers: list[float]
    status: Status = Status.PENDING
    progress: int = 0
    logs: list[str] = field(default_factory=lambda: [INITIAL_LOG])
    result: float | None = None
    created_at: datetime = field(default_factory=_now)
    updated_at: datetime = field(default_factory=_now)


class MemoryStore:

    def __init__(self) -> None:
        self._requests: dict[str, RequestRecord] = {}
        self._cancel_events: dict[str, asyncio.Event] = {}
        self._lock = asyncio.Lock()

    async def create(self, numbers: list[float]) -> RequestRecord:
        record = RequestRecord(id=str(uuid4()), numbers=list(numbers))
        async with self._lock:
            self._requests[record.id] = record
            self._cancel_events[record.id] = asyncio.Event()
        return record

    async def get(self, request_id: str) -> RequestRecord | None:
        async with self._lock:
            return self._requests.get(request_id)

    async def list_all(self) -> list[RequestRecord]:
        """Every request, newest first."""
        async with self._lock:
            return sorted(self._requests.values(), key=lambda r: r.created_at, reverse=True)

    async def update(
        self,
        request_id: str,
        *,
        status: Status | None = None,
        progress: int | None = None,
        result: float | None = None,
        log: str | None = None,
    ) -> RequestRecord | None:

        async with self._lock:
            record = self._requests.get(request_id)
            if record is None or record.status in FINAL_STATUSES:
                return record
            if status is not None:
                record.status = status
            if progress is not None:
                record.progress = progress
            if result is not None:
                record.result = result
            if log is not None:
                record.logs.append(log)
            record.updated_at = _now()
            return record

    async def cancel(self, request_id: str, *, log: str) -> tuple[RequestRecord | None, bool]:
        async with self._lock:
            record = self._requests.get(request_id)
            if record is None:
                return None, False
            if record.status in FINAL_STATUSES:
                return record, False
            record.status = Status.CANCELLED
            record.logs.append(log)
            record.updated_at = _now()
            event = self._cancel_events.get(request_id)
        if event is not None:
            event.set()
        return record, True

    def cancel_event(self, request_id: str) -> asyncio.Event:
        event = self._cancel_events.get(request_id)
        if event is None:
            event = asyncio.Event()
            event.set()
        return event


#: Process-wide store used by the running application. Tests swap it out
#: through the ``get_store`` dependency override.
store = MemoryStore()


def get_store() -> MemoryStore:
    """FastAPI dependency returning the store."""
    return store
