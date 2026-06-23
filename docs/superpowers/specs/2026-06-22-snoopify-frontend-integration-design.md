# Snoopify — Frontend ↔ Backend Integration & Root Orchestration

**Date:** 2026-06-22
**Status:** Approved (design)
**Depends on:**
- `2026-06-22-myenglish-dashboard-conversion-design.md` (frontend spec)
- `2026-06-22-snoopify-backend-design.md` (backend spec — the API this wires to)

**Language note:** written in English to match the sibling specs; Vietnamese
appears only inside content data and UI copy.

## 1. Goal

Wire the existing **Snoopify frontend** (React + Vite SPA, Zustand +
`localStorage`, static `data/seed.ts`) to the **real backend API** (FastAPI +
PostgreSQL + SM-2, already built), and add a **single root entry point** so the
whole system (DB + API + frontend) can be started with one command for testing.

The frontend backend spec explicitly deferred this wiring; this spec is that
deferred work. Reference model for the operational shape: the `kg_intelligence`
project (root `docker-compose` + proxy-based FE↔BE connection), **adapted** for
Snoopify's differences (Vite SPA instead of Next.js; single-user, **no auth**;
no background workers).

## 2. Decisions (constraints)

| Aspect | Decision |
|---|---|
| Run model | **Two modes, one codebase:** (a) `docker compose up` runs db + api + frontend(nginx) for test/demo; (b) `npm run dev` at root runs db + api in Docker + Vite dev (HMR) for coding. |
| FE↔BE connection | FE **always calls relative `/api/*`**; a **proxy** forwards it (Vite dev proxy when coding, nginx when containerized). **No CORS reliance, no backend URL baked into the bundle.** |
| API path mismatch | Backend serves at root (`/review`, `/decks`, …) with **no `/api` prefix**. The proxy **strips `/api`** on forward (Vite `rewrite`, nginx `rewrite`). Backend is left untouched. |
| Server-state | **TanStack Query** (`@tanstack/react-query`) owns server data (decks, session, progress) — caching, loading/error, refetch, invalidation. |
| UI-state | **Zustand stays** for UI/preferences only (review mode, flip, quiz pick, fill, session counters, dark, lang, collapsed, panels). |
| Type contract | A typed `lib/api.ts` + `lib/api-types.ts` mirroring backend Pydantic schemas — the single source of FE↔BE shape truth. |
| Scope | **Full design** of all 5 screens; **phased implementation** starting with a Review vertical slice to validate the harness end-to-end. |
| Dev orchestration tool | Root `package.json` + `concurrently` (portable on Windows; Node already present). Not Make. |
| Ports | db `5432`, api `8000`, frontend `5173` (container `5173:80`; Vite dev also `5173` — modes never run the frontend two ways at once, so no clash). |
| Auth / workers / Redis | **Out of scope** — backend is single-user, no auth, no long-running jobs. |

## 3. Architecture

```
                         FE always calls relative  /api/*
   ┌───────────────────────────────────────────────────────────────┐
   │  TEST/DEMO   (docker compose up)                                │
   │    db ── api (FastAPI :8000) ◄── nginx(frontend :5173→:80)      │
   │                                   serves dist/ + proxy          │
   │                                   /api/* → api:8000 (strip /api) │
   ├───────────────────────────────────────────────────────────────┤
   │  DEV         (npm run dev  → concurrently)                      │
   │    db + api in Docker  ◄── Vite dev server :5173 (HMR)          │
   │                            proxy /api/* → localhost:8000        │
   │                                          (strip /api)            │
   └───────────────────────────────────────────────────────────────┘
```

The proxy is the only thing that knows where the backend is. The browser only
ever sees same-origin `/api/*` requests, so CORS never applies on the hot path.

## 4. Root orchestration

### New files at repo root

- **`docker-compose.yml`** — three services:
  - `db`: `postgres:16`, named volume, healthcheck (`pg_isready`). Credentials
    via `${POSTGRES_*:-default}`.
  - `api`: `build: ./backend`, `depends_on: db (service_healthy)`, command
    `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000
    --reload`, code mounted for reload, `DATABASE_URL` → `db`,
    `SEED_ON_STARTUP=true` (loads the starter deck on first boot), port `8000`.
  - `frontend`: `build: ./frontend` (new multi-stage Dockerfile),
    `depends_on: api`, port `5173:80`. **Only started by the full `up`** — the
    dev path brings up `db api` by name and never starts this service.
- **`.env.example`** — `${VAR:-default}` values (Postgres creds, etc.), mirroring
  the kg pattern.
- **`package.json`** (root) — dev orchestration:
  ```json
  {
    "scripts": {
      "dev": "concurrently -k -n api,web \"docker compose up db api\" \"npm --prefix frontend run dev\"",
      "stop": "docker compose down"
    },
    "devDependencies": { "concurrently": "^9.x" }
  }
  ```
- **`README.md`** (root) — two commands: `docker compose up` (test/demo) and
  `npm run dev` (code with HMR); prerequisites (Docker Desktop, Node); the
  behavior changes in §9.

### New files under `frontend/`

- **`Dockerfile`** — multi-stage: `node:22-alpine` builder runs `npm ci` +
  `npm run build` → static `dist/`; `nginx:alpine` runner copies `dist/` +
  `nginx.conf`.
- **`nginx.conf`** — serve SPA with history fallback (`try_files $uri
  /index.html`) **and** reverse-proxy the API:
  ```nginx
  location /api/ {
    rewrite ^/api/(.*)$ /$1 break;   # strip /api → backend serves at root
    proxy_pass http://api:8000;
  }
  ```
- **`.dockerignore`** — `node_modules`, `dist`, etc.

### Note on `backend/docker-compose.yml`

The existing `backend/docker-compose.yml` stays for backend-only work. The root
compose is the canonical full-system entry point and reuses `./backend` as build
context. (No behavior change to the backend.)

## 5. FE↔BE connection layer

- **`vite.config.ts`** — add a dev proxy that strips `/api`:
  ```ts
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
  ```
- **`src/lib/api.ts`** — typed fetch wrapper. Base URL `import.meta.env.VITE_API_BASE_URL ?? '/api'`.
  `apiGet/apiPost/apiPatch/apiDelete`; on non-OK, parse `{detail}` and throw an
  `ApiError(status, detail)`.
- **`src/lib/api-types.ts`** — TS types mirroring backend schemas:
  `ReviewItemOut`, `QuizOut`, `FillOut`, `GradeRequest`, `GradeResult`,
  `DeckOut`, `CardOut`, `ImportResult`, `ProgressSummary`, `HeatmapOut`,
  `NeedsReviewItem`, `WordOfDay`, `RecentCard`. These are the contract.

### API surface consumed (all proxied under `/api`, backend serves at root)

| FE need | Method & backend path |
|---|---|
| Review session | `GET /review/session?deck_id=&limit=` → `ReviewItemOut[]` |
| Grade a card | `POST /review/grade` `{card_id, rating, mode, is_correct?}` → `GradeResult` |
| Decks + counts/due | `GET /decks` |
| Deck detail + cards | `GET /decks/{id}`, `GET /decks/{id}/cards` |
| Add card | `POST /decks/{id}/cards` |
| Import JSON | `POST /decks/import` |
| Progress summary | `GET /progress/summary` (streak, reviews_today, mastery, weekly_bars[7], due_total) |
| Heatmap | `GET /progress/heatmap` (126 cells, 0..3) |
| Needs review | `GET /progress/needs-review` |
| Word of day | `GET /dashboard/word-of-day` |
| Recently added | `GET /cards/recent` |
| Reset progress | `POST /progress/reset` |

## 6. FE data layer (React Query + Zustand)

- Add `@tanstack/react-query`; create `src/lib/queryClient.ts`; wrap
  `<QueryClientProvider>` in `src/main.tsx`.
- **Per-feature `queries.ts`** with structured query keys:
  `['review','session',deckId]`, `['decks']`, `['decks',id]`,
  `['progress','summary']`, `['progress','heatmap']`,
  `['progress','needs-review']`, `['dashboard','word-of-day']`,
  `['cards','recent']`. Hooks: `useSession`, `useGradeMutation`, `useDecks`,
  `useImportDeck`, `useAddCard`, `useProgressSummary`, `useHeatmap`,
  `useNeedsReview`, `useWordOfDay`, `useRecentCards`, `useResetProgress`.
- **Adapters** (`src/lib/adapters.ts`) map API shapes → existing FE view-models
  so screen components change minimally. Key one for the slice:
  `toSessionItem(api: ReviewItemOut)` →
  - `phon = [api.phonetic, api.pos].filter(Boolean).join(' · ')`
  - `quiz.options = api.quiz.options.map(o => [o.key, o.text])`
  - `quiz.correct = api.quiz.correct_key`
  - carry `cardId = api.card_id` (needed for grading)
- **Zustand trimmed:** remove server data from the store — `importedDecks` (now
  from API), `parseAndImport` (→ `useImportDeck`), `resetProgress` (→
  `useResetProgress` + invalidate). `persist` keeps **only** UI prefs
  (`dark`, `lang`, `collapsed`). Session counters (`sIndex`, `sCorrect`) stay in
  the store but are no longer persisted.

## 7. Vertical slice (Implementation Phase 1) — Review flow

Proves the whole harness end-to-end:

1. Stand up api client, `queryClient`, provider, and the Vite proxy.
2. `useSession()` → `GET /api/review/session` → `toSessionItem` → `SessionItem[]`
   (with `cardId`).
3. `ReviewScreen` (`src/features/review/ReviewScreen.tsx`): replace
   `import { SESSION } from '../../data/seed'` with `useSession()`. Handle
   **loading**, **error**, and **empty** (no due cards → friendly message).
   Drive the index off the fetched length; replace the hardcoded
   `"Business English"` label with the real deck name (or omit).
4. **Grade:** when the user rates a card, in addition to `advanceSession`, fire
   `useGradeMutation` → `POST /api/review/grade`
   `{card_id, rating, mode, is_correct?}`:
   - `mode` from the active review mode (`flash`/`quiz`/`fill`).
   - Flashcard: `rating` from the 3 SR buttons
     (`SpacedRepetitionRating`) → `forgot`/`vague`/`remember`; `is_correct = null`.
   - Quiz/Fill: `is_correct` from the answer; `rating` mapped
     (`correct → remember`, `incorrect → forgot`).
   - On settle, **invalidate** `['progress']` and `['decks']` so dashboard and
     progress reflect the change.
5. `SessionComplete` unchanged (uses `correct` / `total`).

**Slice done =** `docker compose up`, open the app, run a review; grading a card
updates the DB and the dashboard/progress data refetches.

## 8. Expansion (later phases — same patterns)

Each screen swaps its static seed seam for a query hook + adapter:

- **Library** (`LibraryScreen`, `DeckList`, `ImportJsonModal`): `GET /decks`,
  `GET /decks/{id}/cards`; import → `useImportDeck`. Remove the static `seedDecks`
  showcase list and `DeckVM`.
- **Add** (`AddScreen`, `AddCardForm`): `POST /decks/{id}/cards` (create deck if
  needed).
- **Dashboard** (`WordOfDay`, `RecentlyAdded`, `WeekProgress`, `Streak`,
  `TodaySession`): `GET /dashboard/word-of-day`, `GET /cards/recent`,
  `GET /progress/summary`.
- **Progress** (`Calendar`, `MasteryLevels`, `NeedsReview`, `ReviewBars`):
  `GET /progress/heatmap`, `GET /progress/summary`, `GET /progress/needs-review`.
- **Settings reset** (`SettingsPanel`): `useResetProgress` → `POST
  /progress/reset` + invalidate all.

## 9. Behavior changes (must be acknowledged)

- The **5 display-only showcase decks** (Business English, Idioms & Phrasal,
  etc.) **disappear** — the Library shows real decks only (the seeded starter
  deck "Bộ thẻ khởi động" + imported decks).
- The **hardcoded dashboard numbers** (weekly bars, mastery 96/177/213, heatmap)
  become **real** — initially small/empty until reviews accumulate.
- **Session counters** (`sIndex`/`sCorrect`) are no longer persisted across
  reloads; the SM-2 schedule on the server is now authoritative for what's due.
- The hardcoded `"Business English"` deck label in `ReviewScreen` becomes the
  real deck name (or is removed).

## 10. Testing & verification

- **Existing vitest tests** import seed/store directly; screens now use query
  hooks, so add a `renderWithProviders` helper (wraps `QueryClientProvider`) and
  mock `fetch` (MSW or a simple fetch stub). Update `review.test.tsx` in Phase 1;
  update each screen's test as it is migrated. Treat as required debt, not
  optional.
- **Manual:** `docker compose up` → open `http://localhost:5173` → run a review →
  observe progress/dashboard change. Documented in the root README.
- **Done (overall) =** `docker compose up` boots all three services; the FE talks
  to the real API via `/api`; grading a card changes progress/dashboard; `npm run
  dev` gives HMR against the same API.

## 11. File change summary

**New:** root `docker-compose.yml`, `.env.example`, `package.json`, `README.md`;
`frontend/Dockerfile`, `frontend/nginx.conf`, `frontend/.dockerignore`;
`frontend/src/lib/{api.ts,api-types.ts,queryClient.ts,adapters.ts}`;
per-feature `queries.ts`; `frontend/src/test/renderWithProviders.tsx`.

**Changed:** `frontend/vite.config.ts` (proxy), `frontend/src/main.tsx`
(provider), `frontend/src/store/useAppStore.ts` (trim server-state + persist),
`frontend/src/store/types.ts`, screen components (per phase, starting with
`ReviewScreen`), affected tests.

## 12. Out of scope

- Authentication / multi-user (backend has none in v1).
- Production hardening of the containers (non-reload uvicorn, image size, TLS).
- Background workers / Redis / queues (no long-running jobs).
- Any change to the backend API surface.
- E2E/browser automation tests (manual verification only for now).
