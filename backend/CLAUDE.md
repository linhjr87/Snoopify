# CLAUDE.md — Backend

Guidance for Claude Code when working in `backend/`. For the full-stack picture (BFF proxy,
request lifecycle) see the root [`../CLAUDE.md`](../CLAUDE.md). Operational/prod notes
(uv-only dev, Supabase) live in [`README.md`](README.md).

## Stack

FastAPI · SQLAlchemy 2 async (asyncpg) · Alembic · Pydantic v2 · Redis (sessions) · bcrypt.
Python ≥3.12, managed by **uv**. App factory: `app/main.py::create_app`.

## Commands (run from `backend/`)

- `uv sync` · `uv run uvicorn app.main:app --reload` (serves :8000/docs)
- `uv run alembic upgrade head` · `uv run python -m app.seed` (starter deck)
- `uv run ruff check` (line-length 100, target py312)
- `uv run pytest` — needs Postgres up **and** a `snoopify_test` database (override via
  `TEST_DATABASE_URL`); Redis is faked with `fakeredis`. Single file/test:
  `uv run pytest tests/unit/test_srs.py::test_name` · by keyword `uv run pytest -k srs`

## Layering (strict — preserve it)

`api/routers/` (HTTP only) → `app/services/` (business logic) → `app/db/models.py` (ORM).

- Routers stay thin: declare `session: SessionDep, user: CurrentUserDep`, then delegate to a
  service, passing `user.id`. No queries or business logic in routers.
- All request/response bodies pass through Pydantic schemas in `app/schemas/`.
- Register routers in `app/api/router.py`. **Order matters**: static paths before
  parameterized ones (e.g. `/cards/recent` before `/cards/{card_id}`, or "recent" parses as a UUID).

## Auth & sessions

- `app/api/deps.py::get_current_user` reads the `sid` cookie → `app/redis.py::get_session_user_id`
  (Redis key `session:<sid>` → user_id) → loads the `User`. Inject as `CurrentUserDep`; it
  raises 401 when the session is missing/expired.
- Sessions: `create_session` (`secrets.token_urlsafe`, TTL `SESSION_TTL_SECONDS`),
  `delete_session`. Password hashing in `app/services/auth.py` (bcrypt).
- **Every data query is user-scoped** by `user_id` (decks/cards belong to a user). Never read
  or write across users.

## Domain (SM-2 spaced repetition)

- `app/services/srs.py` is the scheduling core: `review(schedule, rating)` returns the updated
  ease/interval/repetitions/lapses; `mastery(repetitions, interval_days)` buckets
  new / learning / proficient (interval ≥ 21 days ⇒ proficient). `forgot` is a lapse (quality < 3).
- Enums (`app/enums.py`, string-valued, shared semantics with the frontend):
  `Rating` = forgot|vague|remember, `ReviewMode` = flash|quiz|fill.
- SM-2 state lives on the `Card` row (`ease_factor, interval_days, repetitions, lapses, due_at`);
  each grade also appends a `ReviewLog`.

## Conventions

- snake_case modules; async throughout (`asyncio_mode=auto`). Surface errors via
  `HTTPException`; user-facing `detail`/messages may be Vietnamese.
- Schema changes: edit `app/db/models.py` → `uv run alembic revision --autogenerate -m "..."`
  → review the generated file in `migrations/versions/` → `upgrade head`. Don't hand-edit
  migrations that have already been applied.
