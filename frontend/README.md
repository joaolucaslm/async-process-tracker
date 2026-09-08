# Frontend — Async Process Tracker

React + TypeScript + Vite. Submit a list of numbers, then watch the backend sum
it in the background: status, progress bar, live logs and the final result.

## Requirements

- Node 20+
- The backend running (see [`../backend/README.md`](../backend/README.md)).
  Expected at `https://async-process-tracker.duckdns.org/` by default.

## Setup

```bash
cd frontend
npm install
cp .env.example .env   # adjust VITE_API_URL if the backend is elsewhere
npm run dev            # http://localhost:5173
```

## Running it with Docker

```bash
docker build --build-arg VITE_API_URL=https://async-process-tracker.duckdns.org/ -t async-tracker-frontend .
docker run -p 8080:80 async-tracker-frontend        # http://localhost:8080
```

The build produces static files served by nginx. `VITE_API_URL` is baked in at
build time, so pass it as a `--build-arg`. Or bring it up together with the
backend from the repo root: `docker compose up --build`.

## Scripts

| Command              | What it does                                  |
| -------------------- | --------------------------------------------- |
| `npm run dev`        | Dev server at http://localhost:5173           |
| `npm run build`      | Type-check (`tsc -b`) and build to `dist/`    |
| `npm run preview`    | Serve the production build locally            |
| `npm run lint`       | ESLint                                        |
| `npm run test`       | Run the unit tests once (Vitest)              |
| `npm run test:watch` | Vitest in watch mode                          |

## Configuration

| Variable       | Default                 | Description              |
| -------------- | ----------------------- | ----------------------- |
| `VITE_API_URL` | `https://async-process-tracker.duckdns.org/` | Base URL of the backend |

## How the code is organised

```
src/
├── main.tsx                    # entry: React root + <BrowserRouter>
├── App.tsx                     # the three routes, inside the shared <Layout>
├── index.css                   # Tailwind v4 theme tokens
│
├── types/
│   └── request.ts              # the API contract as Zod schemas + z.infer types
├── lib/
│   ├── api.ts                  # fetch client: one function per endpoint, ApiError
│   ├── numbers.ts              # parse & validate the "list of numbers" field
│   └── format.ts               # small display helpers (timeAgo, status labels)
├── hooks/
│   ├── useRequestList.ts       # GET /requests on mount, plus a manual reload
│   └── useRequestDetail.ts     # GET /requests/{id} + polling + cancel
│
├── components/                 # presentational, no data fetching
│   ├── Layout.tsx  Button.tsx  Card.tsx  Spinner.tsx  StateMessage.tsx
│   ├── StatusBadge.tsx  ProgressBar.tsx  LogTimeline.tsx
│   ├── RequestListItem.tsx
│   └── NewRequestForm.tsx      # the form itself — validate, create, navigate
└── pages/
    ├── HomePage.tsx            # Screens 1 + 2 side by side: list + new-request form
    └── RequestDetailPage.tsx   # Screen 3 — status, progress, logs, cancel
```

The split is by responsibility:

- **`types/` is the single source of truth for the API shape.** The Zod schemas
  are defined once; the TypeScript types are `z.infer`red from them, and every
  response is parsed at runtime in `lib/api.ts`. Static types and runtime
  validation cannot drift apart, and a malformed response fails loudly instead
  of spreading `undefined` through the UI. No `any` anywhere.
- **`lib/` is framework-free logic** — no React. `numbers.ts` (form parsing) and
  `format.ts` are plain functions, which is why they are the easiest things to
  unit-test.
- **`hooks/` owns all data fetching and effects.** Components never call the API
  directly; they call a hook and render what it returns. The polling rule —
  re-fetch every 1.5 s, stop the moment the status is `completed`, `error` or
  `cancelled` — lives entirely in `useRequestDetail` and is covered by tests.
- **`components/` is presentational and reusable**; **`pages/` composes** a hook
  with components into one screen. A stranger looking for "the list + form
  screen" opens `pages/HomePage.tsx`; looking for "how polling stops" opens
  `hooks/useRequestDetail.ts`.

## Decisions and assumptions

- **Two pages, three screens.** The brief's Screen 1 (list) and Screen 2 (new
  request) share the home page — the list on the left, the form in a sticky
  right rail that drops above the list on narrow viewports. Screen 3 (detail)
  is its own route. `react-router-dom` gives real URLs (`/`, `/requests/:id`;
  `/new` redirects home) so the detail screen is linkable and the back button
  works, for ~10 lines in `App.tsx` — a routing library is not a meta-framework.
- **The status union has five values, not four.** The backend added `cancelled`
  as its own status (see backend README); the frontend mirrors that so a
  user-triggered stop is styled and labelled distinctly from a real `error`.
- **The list screen is not polled.** Only the detail screen has live work to
  follow. The list has a manual **Refresh** button instead, which keeps the
  request count predictable.
- **Polling failures after the first successful load are swallowed.** A single
  dropped request should not blank a screen that is already showing good data;
  the next tick recovers. A failure on the *initial* load does show the error
  state with a retry.
- **The number list is validated client-side before submit** (non-empty, all
  finite numbers, ≤ 1000 items) with Zod, matching the backend's own rules, so
  the common mistakes are caught without a round trip. The backend stays the
  authority — its `422` is surfaced if it disagrees.

## Tests

`npm run test` (Vitest + Testing Library, jsdom). Focused on the parts most
likely to break rather than broad coverage:

- **`lib/numbers.test.ts`** — the form parser: separators, negatives/decimals,
  the empty case, naming the offending token, the 1000-item ceiling.
- **`types/request.test.ts`** — the Zod schema accepts a well-formed request and
  rejects an unknown status or a missing field; the terminal / cancellable
  status helpers.
- **`hooks/useRequestDetail.test.tsx`** — the polling contract: it keeps polling
  while `processing`, and **stops** once the status is `completed` or `error`
  (asserted by the call count staying flat afterwards); initial-load errors
  surface.
