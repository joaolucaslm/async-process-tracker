# PLANNING.md

## 1. Understanding the problem

The goal is to build a full-stack application that implements the pattern of
**asynchronous processing with progress tracking**: the user submits a task
(summing a list of numbers), the API responds immediately without waiting for the
processing to finish, the work runs in the background through simulated steps
(with deliberate delays), and the frontend follows that progress via polling
until completion.

The application must therefore guarantee the following:

- the API **never blocks** while a request is being processed in the background;
- the request state (status, progress, logs, result) is updated reliably and can
  be queried at any moment;
- the frontend reflects that state in near real time, with no manual action from
  the user beyond opening the detail screen.

## 2. Stack and technical decisions

### Database

None will be used. The brief itself specifies in-memory storage ("a list or
dictionary in the running process is enough"), and the application has no
requirement to persist across restarts. Requests and their state (status,
progress, logs, result) live in a dictionary held in memory for the lifetime of
the process.

### Backend — Python + FastAPI

FastAPI was chosen because it is asynchronous by nature and provides
`BackgroundTasks`, which maps directly onto the core need of the challenge:
accept the request and return an immediate response while the processing runs
independently without blocking the API's event loop.

**Modular structure**, proportional to the scope of the project (4 endpoints, no
real persistence):

```
app/
├── main.py              # FastAPI instance, router registration
├── routers/
│   └── requests.py      # the 4 endpoints (POST, GET list, GET detail, POST cancel)
├── schemas/
│   └── request.py       # Pydantic models (RequestCreate, RequestOut, StatusEnum)
├── services/
│   └── processor.py     # background routine: validation, calculation, state updates
└── storage/
    └── memory_store.py  # abstraction over the in-memory dictionary (get/set/list)
```

I chose not to adopt a heavier layered architecture (e.g. clean architecture with
use cases, repository interfaces, etc.), because the scope does not justify that
complexity: there is no anticipated change of framework or storage mechanism, and
a heavier split would make the code harder to navigate with no real gain in
maintainability. The `routers` / `schemas` / `services` / `storage` split already
separates the responsibilities clearly (HTTP input, validation/typing, processing
logic, and state access).

Data validation and typing on the backend are done with **Pydantic**, including
the union type of the `status` field (`pending`, `processing`, `completed`,
`error`).

### Tests

Unit tests are written on both the backend and the frontend, prioritising the
most sensitive points of the challenge rather than broad coverage:

- **Backend**: request creation, status transitions, non-blocking behaviour of
  the API during processing (a request in `processing` must not prevent other
  calls from responding), and the cancellation flow.
- **Frontend**: polling behaviour (stopping correctly when reaching `completed`
  or `error`) and validation of the data received from the API via Zod.

### Frontend — React + TypeScript

Frontend built with **React + TypeScript**, without meta-frameworks (Next.js) —
plain React (via Vite), as stated in the brief ("Function components, useState,
useEffect and basic typing are enough").

Styling with **TailwindCSS**, including responsiveness for mobile use as a bonus
(not required by the brief, but added as good practice).

**Zod** is used to:

- validate the request creation form before submitting;
- validate and type (via `z.infer`) the data returned by the API, providing
  runtime safety on top of TypeScript's static checking.

Screens:

1. **Request list** — fetched on mount, with loading, error and empty handling.
2. **New request** — form for the list of numbers; submitting creates the request
   and navigates to the detail screen.
3. **Request detail** — status, progress, logs and result, with polling on an
   interval that stops when reaching `completed` or `error`, plus a cancel
   action.

### Deployment

- **Backend**: hosted on an EC2 instance (AWS Free Tier), running via Uvicorn
  behind an Nginx reverse proxy.
- **Frontend**: hosted on Vercel, pointing its API calls at the EC2 endpoint.

Deployment is treated as an extra. The project remains runnable end to end
locally just by following the README, as required by the brief.

## 3. Expected difficulties

- **Guaranteeing the API is genuinely non-blocking**: FastAPI's `BackgroundTasks`
  runs in the same process; it must be confirmed that the processing `sleep`s do
  not stall the event loop (using `asyncio.sleep` instead of `time.sleep`, or
  running in a separate thread if needed).
- **In-memory state consistency under concurrency**: since multiple requests can
  be processed simultaneously, updating the shared dictionary needs care to avoid
  race conditions.
- **Cancelling a running process**: cleanly interrupting a task already dispatched
  in the background is trickier than just changing the stored status — the
  processing routine must check that cancellation signal during its execution.
- **Synchronisation between the frontend polling and rapid backend state
  changes**: choosing a polling interval that balances responsiveness against the
  number of requests.
- **CORS between frontend (Vercel) and backend (EC2)** when configuring the
  deployment.

## 4. Assumptions made

- The cancellation status is modelled as its own value (`cancelled`), in addition
  to the four specified in the brief, to clearly distinguish it from a real
  processing error. *(revisit here if we decide to reuse `error`)*
- No authentication or multi-user support is needed; the application assumes a
  single user/session observing the requests.
- The AWS/Vercel deployment is treated as added value, not an evaluation
  requirement — local operation via the README is the primary reference.
