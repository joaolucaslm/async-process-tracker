# Backend — Async Process Tracker API

FastAPI service that accepts a list of numbers, sums it in the background
through four deliberately slow steps, and reports status, progress, logs and
result while the work runs.

## Running it locally

Requires Python 3.11+.

```bash
cd backend

python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API is then on <http://localhost:8000>, with interactive docs at
<http://localhost:8000/docs>.

Configuration is optional, copy `.env.example` to `.env` to change the
allowed CORS origins or shorten the step delays.

## Running the tests

```bash
pip install -r requirements-dev.txt
pytest
```

## API

| Method | Path                      | Description |
| ------ | ------------------------- | ----------- |
| `POST` | `/requests`               | Creates a request and schedules its processing. Answers `202` with `{id, status}` immediately. |
| `GET`  | `/requests`               | Every request, newest first, without the log history. |
| `GET`  | `/requests/{id}`          | The complete object: status, progress, logs and result. |
| `POST` | `/requests/{id}/cancel`   | Moves a running request to `cancelled` and stops it. |
| `GET`  | `/health`                 | Liveness probe. |

### The request object

```json
{
  "id": "0f5d0b0e-2b6f-4b3e-9a2a-2f3b1f0a9c11",
  "status": "processing",
  "progress": 30,
  "numbers": [10, 20, 5],
  "result": null,
  "created_at": "2026-09-07T19:57:38.733321Z",
  "updated_at": "2026-09-07T19:57:41.742126Z",
  "logs": ["Request created", "Starting processing...", "Validating data..."]
}
```

`status` is one of `pending`, `processing`, `completed`, `error`, `cancelled`.

### Processing steps

| Step | Waits | Log | Progress | Status |
| ---- | ----- | --- | -------- | ------ |
| Start       | —   | `Starting processing...` | 0   | `processing` |
| Validation  | 3 s | `Validating data...`     | 30  | |
| Calculation | 5 s | `Calculating sum...`     | 70  | |
| Completion  | —   | `Finished successfully.` | 100 | `completed`, `result` set |

A full run takes about 8 seconds, which is the point: the API keeps answering
every other call throughout.

### Status codes

| Code  | When |
| ----- | ---- |
| `202` | Request accepted for processing. |
| `409` | Cancelling a request that already reached a final status. |
| `422` | Empty list, more than 1000 numbers, or a value that is not a number. |
| `404` | Unknown request id. |

## How the code is organised

```
app/
├── main.py                    # FastAPI instance, CORS, router registration
├── config.py                  # settings read from the environment
├── routers/requests.py        # the four endpoints — HTTP only
├── schemas/request.py         # Pydantic models and the status enum
├── services/processor.py      # the background routine and its four steps
└── storage/memory_store.py    # the in-memory dictionary and its lock
tests/
├── test_api.py                # the contract the frontend depends on
└── test_processor.py          # what happens *while* a request runs
```

The dependency direction is one-way: `routers → services → storage → schemas`.
A router never touches the dictionary directly and the processor never knows
about HTTP, so the processing rules can be tested without a client and the
storage can be swapped without touching either.

### Design notes

**Storage is in memory, as specified.** State lives in a dictionary inside
`MemoryStore` and dies with the process. Every mutation goes through an
`asyncio.Lock`, which keeps the read-modify-write inside `cancel()` atomic and
keeps all the concurrency reasoning in a single file.

**Nothing blocks the event loop.** The delays are `asyncio.sleep`, never
`time.sleep`, and the routine is scheduled with FastAPI's `BackgroundTasks`
after the response is sent. `test_the_api_answers_while_a_request_is_processing`
pins this down: it starts a run and asserts the API answers well before the
sleep is over.

**Cancellation stops the work, not just the status.** Each request carries an
`asyncio.Event`. The routine races every delay against that event
(`asyncio.wait_for`), so a cancel takes effect within milliseconds instead of
at the end of the current sleep, and the progress freezes where it was.

**Final statuses are final.** Once a request is `completed`, `error` or
`cancelled`, `MemoryStore.update` ignores further writes. A background routine
that somehow missed the cancellation signal therefore cannot resurrect a
request the user already stopped.

### Assumptions

* **`cancelled` is its own status**, not a reuse of `error` — the case allows
  either, and a user-initiated stop is not a failure. The frontend's status
  union carries five values, not four.
* **Cancelling a finished request is a `409`**, not a silent success: nothing
  changed, and the caller is told the current status.
* **The list of numbers must have between 1 and 1000 items.** An empty list has
  no sum worth watching, and the ceiling keeps a payload from being unbounded.
  Both are rejected at the door with `422`.
* **The `error` status is reachable but rare.** Pydantic rejects malformed
  input before anything is stored, so `error` is left for a failure during
  processing — the routine turns any exception into it.
* **No authentication.** Single user, single session, as the case implies.
