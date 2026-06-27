# Snoopify

Vietnamese-first English vocabulary app with **SM-2 spaced repetition**. Build your own
decks, review due cards in flashcard / quiz / fill modes, and track your streak and progress.

**Stack:** Next.js 15 (App Router) frontend · FastAPI + PostgreSQL backend · Redis-backed
sessions. The frontend is a BFF — it calls relative `/api/*` and proxies to the API.

## Run the whole system (test/demo)

```bash
cp .env.example .env        # first time only
docker compose up           # db + redis + api + frontend
```

Open **http://localhost:3000**. The `api` service runs `alembic upgrade head` on boot;
seed a starter deck once it's up with:

```bash
docker compose exec api python -m app.seed
```

## Develop with hot reload

Install root tooling and frontend dependencies after a fresh clone:

```bash
npm install
npm --prefix frontend install
```

Then start the full dev stack with one command (Postgres + API in Docker, Next.js locally):

```bash
npm run dev
```

Or run the parts in separate terminals:

```bash
# Terminal 1 — database + API (and Redis)
docker compose up db redis api

# Terminal 2 — frontend
npm --prefix frontend run dev
```

- Frontend (Next.js): **http://localhost:3000** with HMR
- API (FastAPI) + Swagger docs: **http://localhost:8000/docs**

See [`backend/README.md`](backend/README.md) for running the API without Docker (uv +
local Postgres) and for Supabase/production notes.

## How it fits together

```
Browser ──▶ Next.js (:3000) ──/api/* rewrite──▶ FastAPI (:8000) ──▶ Postgres (:5432)
                  │  BFF                                          └─▶ Redis (:6379) sessions
```

- The frontend **always** calls relative `/api/*`. `next.config.ts` rewrites `/api/:path*`
  to `BACKEND_URL/:path*`, stripping the `/api` prefix (the API serves at root).
- **Auth** is cookie-based: the API issues an `sid` cookie backed by a Redis session.
  Next.js `middleware.ts` redirects unauthenticated users to `/login`.
- **Review** loads due cards from the API; grading persists the server's SM-2 scheduling
  updates (ease factor, interval, repetitions, lapses, next due date).

## Testing

```bash
npm --prefix frontend run test      # Vitest + Testing Library
cd backend && uv run pytest         # needs Postgres up + a snoopify_test database
```

## Project layout

| Path | What |
|------|------|
| `frontend/` | Next.js 15 app — routes in `src/app/`, features in `src/features/`, API clients in `src/lib/` |
| `backend/` | FastAPI app — `app/api/routers/` (HTTP), `app/services/` (logic incl. SM-2 in `srs.py`), `app/db/` (models) |
| `docs/superpowers/plans/` | Design specs and implementation plans |
| `docker-compose.yml` | db · redis · api · frontend services |

New here? See [`CLAUDE.md`](CLAUDE.md) for an architecture and conventions overview.

## Configuration

Root `.env` (consumed by Docker Compose) sets the Postgres credentials:

```env
POSTGRES_USER=snoopify
POSTGRES_PASSWORD=snoopify
POSTGRES_DB=snoopify
```

Key API settings (see `backend/app/config.py`): `DATABASE_URL`, `REDIS_URL`,
`CORS_ORIGINS` (must include the frontend origin), `COOKIE_SECURE` (set `true` in
production), `SESSION_TTL_SECONDS`. The frontend reads `BACKEND_URL` to target the API.
