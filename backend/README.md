# Snoopify Backend

FastAPI + PostgreSQL backend for Snoopify. Multi-user with cookie-session auth
(Redis-backed sessions + bcrypt) and SM-2 spaced-repetition scheduling. See the design spec at
`../docs/superpowers/specs/2026-06-22-snoopify-backend-design.md`.

## Run (dev)

```bash
cp .env.example .env
docker compose up -d db
docker compose exec db psql -U snoopify -c "CREATE DATABASE snoopify_test;"  # once, for tests
uv sync
uv run alembic upgrade head
uv run python -m app.seed            # load the starter deck
uv run uvicorn app.main:app --reload # http://localhost:8000/docs
```

Or run everything in Docker: `docker compose up` (the `api` service runs
`alembic upgrade head` then uvicorn).

## Test

```bash
uv run pytest          # needs Postgres up + snoopify_test database
```

## Supabase (prod)

Point `DATABASE_URL` at the Supabase pooled connection string (sslmode=require)
and set `DB_DISABLE_STATEMENT_CACHE=true` (pgbouncer needs
`statement_cache_size=0` for asyncpg). Then `alembic upgrade head`.
