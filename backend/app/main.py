from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import requests

app = FastAPI(
    title="Async Process Tracker API",
    description=(
        "Accepts a list of numbers, sums it in the background through four "
        "delayed steps, and reports progress while it happens."
    ),
    version="1.0.0",
)

# The frontend runs on a different origin (Vite locally, Vercel in production),
# so it needs to be allowed explicitly. Configure with the CORS_ORIGINS env var.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(requests.router)


@app.get("/health", tags=["meta"], summary="Liveness probe")
async def health() -> dict[str, str]:
    return {"status": "ok"}
