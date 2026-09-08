from __future__ import annotations

import os
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()

DEFAULT_CORS_ORIGINS = ("http://localhost:5173", "http://127.0.0.1:5173")


def _env_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _env_origins(name: str, default: tuple[str, ...]) -> list[str]:
    raw = os.getenv(name)
    if not raw:
        return list(default)
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


@dataclass
class Settings:
    """Mutable on purpose: tests monkeypatch the delays on this instance."""

    validation_delay: float = field(default_factory=lambda: _env_float("VALIDATION_DELAY", 3.0))
    calculation_delay: float = field(default_factory=lambda: _env_float("CALCULATION_DELAY", 5.0))
    cors_origins: list[str] = field(
        default_factory=lambda: _env_origins("CORS_ORIGINS", DEFAULT_CORS_ORIGINS)
    )


settings = Settings()
