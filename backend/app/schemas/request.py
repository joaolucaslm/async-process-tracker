from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

MAX_NUMBERS = 1000


class Status(str, Enum):
    """Lifecycle of a request.

    ``cancelled`` is an addition of ours (the case allows "either error or a
    cancelled status of your own"), so a user-triggered stop is not confused
    with a real processing failure.
    """

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"
    CANCELLED = "cancelled"


#: Statuses from which nothing else can happen. Once a request reaches one of
#: these it is frozen: neither the processor nor a cancel call may change it.
FINAL_STATUSES = frozenset({Status.COMPLETED, Status.ERROR, Status.CANCELLED})


class RequestCreate(BaseModel):
    """Body of ``POST /requests`` — the form data, i.e. the list of numbers."""

    numbers: Annotated[list[float], Field(min_length=1, max_length=MAX_NUMBERS)]

    model_config = ConfigDict(json_schema_extra={"examples": [{"numbers": [10, 20, 5]}]})


class RequestSummary(BaseModel):
    """Row of ``GET /requests``: identity and progress, without the log history."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    status: Status
    progress: int
    numbers: list[float]
    result: float | None
    created_at: datetime
    updated_at: datetime


class RequestDetail(RequestSummary):
    """Full object returned by ``GET /requests/{id}``, logs included."""

    logs: list[str]


class RequestAccepted(BaseModel):
    """Body of ``POST /requests``: what the caller needs to start polling."""

    id: str
    status: Status


class CancelResponse(BaseModel):
    """Confirmation of the status change made by ``POST /requests/{id}/cancel``."""

    id: str
    status: Status
    message: str
