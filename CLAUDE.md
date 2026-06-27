# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Vietnamese-first English vocabulary app with SM-2 spaced repetition. Monorepo:
Next.js BFF frontend + FastAPI backend + Postgres/Redis.

## Tech Stack

- **Frontend**: Next.js 15 (App Router, `output: standalone`), React 18, TypeScript,
  Zustand 4 (persisted state), Tailwind CSS 3. Tests: Vitest 4 + Testing Library + jsdom.
- **Backend**: FastAPI, SQLAlchemy 2 (async + asyncpg), Alembic, Pydantic v2,
  Redis (sessions), bcrypt (auth). Python ≥3.12, managed by **uv**. Tests: pytest + httpx + fakeredis. Lint: ruff.
- **Infra**: PostgreSQL 16, Redis 7, Docker Compose.

## Build & Run

- **Full stack (dev, hot reload)**: `npm run dev` — runs `docker compose up db api` + `next dev` via concurrently. App at http://localhost:3000, API at http://localhost:8000/docs.
- **Full stack (containers)**: `cp .env.example .env && docker compose up`
- **Frontend**: `npm --prefix frontend run dev | build | start | lint`
- **Backend** (run from `backend/`): `uv sync` · `uv run alembic upgrade head` · `uv run python -m app.seed` (starter deck) · `uv run uvicorn app.main:app --reload` · `uv run ruff check`

## Testing

- **Frontend** (Vitest + Testing Library, jsdom; globals enabled): `npm --prefix frontend run test`. Watch: `... run test:watch`. Single file/test:
  `npm --prefix frontend run test -- src/lib/grading.test.ts` · by name `... -- -t "grades a lapse"`.
- **Backend** (pytest, `asyncio_mode=auto`): needs Postgres up **and** a `snoopify_test` database (override via `TEST_DATABASE_URL`); Redis is faked, so only Postgres must run. From `backend/`: `uv run pytest`. Single file/test:
  `uv run pytest tests/unit/test_srs.py` · `uv run pytest tests/unit/test_srs.py::test_name` · by keyword `uv run pytest -k srs`.

## Architecture

Frontend is a **BFF**: it always calls relative `/api/*`; `next.config.ts` rewrites
`/api/:path*` → `BACKEND_URL/:path*` (strips the `/api` prefix — the FastAPI app serves at root).

- **Server Components** fetch via `frontend/src/lib/api-server.ts` (`apiFetch`, `server-only`, forwards the `sid` cookie).
- **Client Components** fetch via `frontend/src/lib/api.ts` (`apiGet/apiPost/apiPatch/apiDelete`).
- **Auth**: backend issues a `sid` cookie backed by a Redis session → resolves to a `User` row (`backend/app/api/deps.py::get_current_user`). Next `middleware.ts` redirects unauthenticated users to `/login`; server fetches use `orRedirect` to bounce 401s to `/api/signout`.
- **Domain core**: SM-2 scheduling lives in `backend/app/services/srs.py`. Entities (`backend/app/db/models.py`): `User`, `Deck`, `Card` (holds SM-2 fields: ease_factor, interval_days, repetitions, lapses, due_at), `ReviewLog`. Decks/cards are **per-user** (scoped by `user_id`).

**Request path** (e.g. grade a review): client `apiPost('/review/...')` → `/api/review/...`
→ Next rewrite → FastAPI `app/api/routers/review.py` → `get_current_user` dep → `app/services/review.py` + `srs.py` → SQLAlchemy → Postgres.

## Project Structure

- `frontend/src/app/` — App Router routes (`page.tsx` = dashboard; `add`, `library`, `progress`, `review`, `login`; `api/signout/route.ts`)
- `frontend/src/features/<feature>/` — feature UI + logic (add, auth, dashboard, library, progress, review)
- `frontend/src/components/` — `ui/` primitives + `layout/` shell
- `frontend/src/lib/` — API clients (`api.ts`, `api-server.ts`), `adapters.ts`, `grading.ts`, `api-types.ts`
- `frontend/src/store/` — Zustand stores (`useAppStore` persisted to localStorage `snoopify_v1`, `useTourStore`)
- `frontend/src/i18n/` — `dictionary.ts` (`vn`/`en`) + `useT()` hook
- `backend/app/api/routers/` — HTTP layer · `backend/app/services/` — business logic · `backend/app/schemas/` — Pydantic I/O · `backend/app/db/` — models + session
- `docs/superpowers/plans/` — design specs & implementation plans

## Conventions

- **Frontend files**: PascalCase components (`DeckList.tsx`), camelCase utils/hooks (`useT.ts`, `api.ts`). Feature-first folders. Tests co-located as `*.test.ts(x)`.
- **Backend files**: snake_case. Strict layering: routers → services → models; never put business logic in routers. Pydantic schemas mediate all request/response bodies.
- **Errors**: frontend throws `ApiError` (status + detail); backend raises `HTTPException`.
- **i18n**: never hardcode UI strings — add a key to both `vn` and `en` in `dictionary.ts` and read it via `useT()`. App is Vietnamese-first (`<html lang="vi">`).
- **DB changes**: edit `backend/app/db/models.py`, then generate an Alembic migration (`backend/migrations/versions/`). Don't hand-edit applied migrations.

## Git

- Conventional Commits with scope: `fix(frontend):`, `feat(auth):`, `chore(backend):`, `docs:`, `build:`.
- Branches: `feat/*`, `fix/*` off `main`. Integrate via GitHub PRs (merge commits). Commit/push only when asked.
