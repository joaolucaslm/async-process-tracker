# Async Process Tracker

A small full-stack app that accepts a request immediately, does the work in the
background, and lets the user watch it happen: submit a list of numbers, and
watch the backend sum it through four deliberately slow steps while progress
goes from 0 to 100 %, the logs fill in, and the final result appears.

- **Backend** — Python + FastAPI, in-memory storage, non-blocking background
  processing. Details and design notes in [`backend/README.md`](backend/README.md).
- **Frontend** — React + TypeScript + Vite, three screens, polling on the detail
  screen. Details and design notes in [`frontend/README.md`](frontend/README.md).
- **Planning** — how the problem was understood and the project structured,
  written before coding, in [`PLANNING.md`](PLANNING.md).

## Running it locally

Two terminals. Start the backend first.

### 1. Backend — http://localhost:8000

Requires Python 3.11+.

```bash
cd backend

python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

Interactive API docs at http://localhost:8000/docs.

### 2. Frontend — http://localhost:5173

Requires Node 20+.

```bash
cd frontend

npm install
cp .env.example .env              # only needed if the backend is not on :8000

npm run dev
```

Open http://localhost:5173, create a request, and watch it run.

## Running the tests

```bash
# Backend
cd backend
pip install -r requirements-dev.txt
pytest

# Frontend
cd frontend
npm run test
```

## What to look at

| Where | What it demonstrates |
| ----- | -------------------- |
| Submit a request, then in a second tab open the list or create another | the API keeps answering while a request processes — nothing blocks |
| The detail screen | polling every 1.5 s, progress + logs updating live, polling stops at `completed` / `error` / `cancelled` |
| **Cancel request** on a running request | the background work stops within milliseconds, not at the end of the current sleep; progress freezes where it was |
| `backend/README.md` / `frontend/README.md` | the file/folder layout and why it is split that way |
