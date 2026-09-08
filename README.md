# Async Process Tracker

Full-stack demo of asynchronous processing with progress tracking: submit a list
of numbers, the API accepts it immediately, a background routine sums it through
deliberately slow steps, and the frontend follows status, progress, logs and the
result by polling.

- **Backend** — FastAPI, in-memory state. See [`backend/README.md`](backend/README.md).
- **Frontend** — React + TypeScript + Vite. See [`frontend/README.md`](frontend/README.md).

## Live demo

| Service  | URL                                              |
| -------- | ------------------------------------------------ |
| Frontend | <https://async-process-tracker.vercel.app/>      |
| Backend  | <https://async-process-tracker.duckdns.org/>     |
| API docs | <https://async-process-tracker.duckdns.org/docs> |

The frontend is deployed on Vercel; the backend runs on an EC2 instance behind
nginx. State is in memory, so a backend restart clears every request.

## Run everything with Docker Compose

Requires Docker (with Compose v2).

```bash
docker compose up --build
```

| Service  | URL                          |
| -------- | ---------------------------- |
| Frontend | <http://localhost:8080>      |
| Backend  | <http://localhost:8000>      |
| API docs | <http://localhost:8000/docs> |

Stop with `Ctrl+C`, then `docker compose down` to remove the containers.

### Notes

- The frontend is built to static files and served by nginx. `VITE_API_URL` is
  baked in at build time (default `http://localhost:8000`); override it via the
  `frontend.build.args` in `docker-compose.yml` if the backend is published
  elsewhere, then rebuild.
- The backend's `CORS_ORIGINS` is set in `docker-compose.yml` to allow the
  dockerised frontend origin plus the local Vite dev server.
- State is in memory, so `docker compose down` (or a backend restart) clears all
  requests.

## Run the services directly

See each service's README for the local (non-Docker) workflow and the tests.
