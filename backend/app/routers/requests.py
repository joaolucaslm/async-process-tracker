from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status as http_status

from app.schemas.request import (
    CancelResponse,
    RequestAccepted,
    RequestCreate,
    RequestDetail,
    RequestSummary,
)
from app.services.processor import process_request
from app.storage.memory_store import MemoryStore, get_store

router = APIRouter(prefix="/requests", tags=["requests"])

StoreDep = Annotated[MemoryStore, Depends(get_store)]

LOG_CANCELLED = "Cancelled by the user."


@router.post(
    "",
    response_model=RequestAccepted,
    status_code=http_status.HTTP_202_ACCEPTED,
    summary="Create a request and start processing it in the background",
)
async def create_request(
    payload: RequestCreate,
    background_tasks: BackgroundTasks,
    store: StoreDep,
) -> RequestAccepted:
    """Store the request as ``pending`` and answer immediately.

    202 Accepted rather than 201: the work has been accepted, not finished.
    The processing routine is scheduled as a background task and runs after
    this response has been sent.
    """
    record = await store.create(payload.numbers)
    background_tasks.add_task(process_request, record.id, store)
    return RequestAccepted(id=record.id, status=record.status)


@router.get(
    "",
    response_model=list[RequestSummary],
    summary="List every request",
)
async def list_requests(store: StoreDep) -> list[RequestSummary]:
    """Newest first. Logs are left out here; the detail endpoint carries them."""
    records = await store.list_all()
    return [RequestSummary.model_validate(record) for record in records]


@router.get(
    "/{request_id}",
    response_model=RequestDetail,
    summary="Current state of one request",
)
async def get_request(request_id: str, store: StoreDep) -> RequestDetail:
    """The complete object: status, progress, logs and result."""
    record = await store.get(request_id)
    if record is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Request not found.",
        )
    return RequestDetail.model_validate(record)


@router.post(
    "/{request_id}/cancel",
    response_model=CancelResponse,
    summary="Stop a request that is still running",
)
async def cancel_request(request_id: str, store: StoreDep) -> CancelResponse:
    """Move a pending or processing request to ``cancelled``.

    A request that already reached a final status is a conflict, not a
    success: nothing was changed, and the caller is told what it is now.
    """
    record, changed = await store.cancel(request_id, log=LOG_CANCELLED)
    if record is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Request not found.",
        )
    if not changed:
        raise HTTPException(
            status_code=http_status.HTTP_409_CONFLICT,
            detail=f"Request already finished with status '{record.status.value}'.",
        )
    return CancelResponse(
        id=record.id,
        status=record.status,
        message="Request cancelled.",
    )
