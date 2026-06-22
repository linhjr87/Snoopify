# Snoopify Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-user, no-auth FastAPI backend that persists Snoopify decks/cards in PostgreSQL and schedules reviews with an SM-2 spaced-repetition engine.

**Architecture:** Layered horizontal split — `api/routers` (HTTP) → `services` (business logic) → `db` (SQLAlchemy async models/session). The SM-2 engine is a pure, DB-free module (`services/srs.py`) so it is unit-tested in isolation. All statistics are derived from three tables (`decks`, `cards`, `review_logs`); nothing is denormalized.

**Tech Stack:** Python 3.12, FastAPI (async), SQLAlchemy 2.0 async + asyncpg, Alembic, Pydantic v2 + pydantic-settings, PostgreSQL 16 (Docker dev → Supabase prod), pytest + pytest-asyncio + httpx, `uv`, ruff.

## Global Constraints

Every task's requirements implicitly include this section.

- **Python:** 3.12. **Framework:** FastAPI async; all route handlers and service functions are `async def`.
- **Single user, no auth** in v1 — no `users` table, no `user_id` columns, no auth middleware.
- **Primary keys:** UUID (`uuid.uuid4()`, server-side default). **Timestamps:** `TIMESTAMP WITH TIME ZONE`, stored UTC.
- **SM-2 grade→quality mapping (exact):** `forgot = 2`, `vague = 3`, `remember = 5`. Ease clamp `>= 1.3`.
- **Mastery thresholds (exact):** `repetitions == 0` → `"new"`; `0 < interval_days < 21` → `"learning"`; `interval_days >= 21` → `"proficient"`.
- **Day boundaries** (streak / heatmap / weekly bars / word-of-day) computed in `APP_TIMEZONE` (default `Asia/Ho_Chi_Minh`); all stored timestamps are UTC.
- **Import error message (verbatim, copied from FE):** `JSON không hợp lệ hoặc thiếu trường bắt buộc (deck, cards[].word).`
- **Seed deck (exact):** name `Bộ thẻ khởi động`, topic `từ vựng`, with the 5 FE `SESSION` cards.
- **CORS:** allow origin `http://localhost:5173`.
- **Supabase gotcha:** when `DATABASE_URL` points at Supabase's pgbouncer pooler, the async engine must pass `connect_args={"statement_cache_size": 0}` (gated by setting `db_disable_statement_cache`).
- **All work happens under `backend/`.** Commit after every task. Run commands from `backend/` unless stated otherwise.

---

## File Structure

```
backend/
  pyproject.toml                 # deps + pytest/ruff config           (Task 1)
  .env.example                   # config template                     (Task 3)
  Dockerfile  docker-compose.yml # postgres + api                      (Task 3)
  alembic.ini                    # alembic config                      (Task 3)
  migrations/env.py + versions/  # schema migrations                   (Task 3)
  app/
    __init__.py
    config.py                    # Settings (pydantic-settings)        (Task 1)
    enums.py                     # Rating, ReviewMode                   (Task 2)
    main.py                      # app factory + lifespan               (Task 1, 11)
    db/
      base.py                    # DeclarativeBase                      (Task 3)
      session.py                 # async engine + get_session dep       (Task 3)
      models.py                  # Deck, Card, ReviewLog                (Task 3)
    schemas/
      deck.py card.py review.py progress.py                            (Tasks 4,5,7,9)
    services/
      srs.py                     # SM-2 pure functions + mastery        (Task 2)
      decks.py cards.py          # CRUD                                 (Tasks 4,5)
      importer.py                # parse_import (ports parseAndImport)  (Task 6)
      review.py                  # quiz/fill generation + session       (Tasks 7,8)
      progress.py                # streak/heatmap/mastery/word-of-day   (Task 9)
    api/
      router.py                  # aggregates feature routers           (Task 1+)
      deps.py                    # SessionDep                           (Task 3)
      routers/
        health.py decks.py cards.py review.py progress.py
    seed.py                      # starter deck seeding                 (Task 11)
  tests/
    conftest.py                  # fixtures (client, db)                (Tasks 1,3)
    unit/   test_srs.py test_review_gen.py test_importer.py
    api/    test_health.py test_decks.py test_cards.py test_import.py
            test_review.py test_grade.py test_progress.py test_reset.py
```

---

## Task 1: Project scaffold, config, health endpoint

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/__init__.py` (empty)
- Create: `backend/app/config.py`
- Create: `backend/app/api/__init__.py` (empty), `backend/app/api/routers/__init__.py` (empty)
- Create: `backend/app/api/routers/health.py`
- Create: `backend/app/api/router.py`
- Create: `backend/app/main.py`
- Create/Test: `backend/tests/__init__.py` (empty), `backend/tests/conftest.py`, `backend/tests/api/__init__.py` (empty), `backend/tests/api/test_health.py`

**Interfaces:**
- Produces: `app.main:app` (FastAPI instance); `app.config.get_settings() -> Settings`; `app.api.router:api_router` (APIRouter that feature tasks extend); pytest `client` fixture (httpx `AsyncClient` over the ASGI app).

- [ ] **Step 1: Write `pyproject.toml`**

```toml
[project]
name = "snoopify-backend"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
  "fastapi>=0.115",
  "uvicorn[standard]>=0.34",
  "sqlalchemy[asyncio]>=2.0.36",
  "asyncpg>=0.30",
  "alembic>=1.14",
  "pydantic>=2.10",
  "pydantic-settings>=2.7",
]

[dependency-groups]
dev = ["pytest>=8.3", "pytest-asyncio>=0.25", "httpx>=0.28", "ruff>=0.9"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]

[tool.ruff]
line-length = 100
target-version = "py312"
```

- [ ] **Step 2: Install deps**

Run: `cd backend && uv sync`
Expected: a `.venv` is created and dependencies resolve. (If `uv` is unavailable: `python -m venv .venv && .venv/Scripts/pip install -e ".[dev]"` — adjust `pyproject` to `[project.optional-dependencies]` if using pip.)

- [ ] **Step 3: Write the failing test**

`backend/tests/api/test_health.py`:
```python
async def test_health_returns_ok(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}
```

`backend/tests/conftest.py`:
```python
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd backend && uv run pytest tests/api/test_health.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.main'` (or `app`).

- [ ] **Step 5: Write config + app skeleton**

`backend/app/config.py`:
```python
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://snoopify:snoopify@localhost:5432/snoopify"
    cors_origins: list[str] = ["http://localhost:5173"]
    app_env: str = "dev"
    app_timezone: str = "Asia/Ho_Chi_Minh"
    seed_on_startup: bool = False
    db_disable_statement_cache: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

`backend/app/api/routers/health.py`:
```python
from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
```

`backend/app/api/router.py`:
```python
from fastapi import APIRouter

from app.api.routers import health

api_router = APIRouter()
api_router.include_router(health.router)
```

`backend/app/main.py`:
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Snoopify Backend", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router)
    return app


app = create_app()
```

Also create empty files: `backend/app/__init__.py`, `backend/app/api/__init__.py`, `backend/app/api/routers/__init__.py`, `backend/tests/__init__.py`, `backend/tests/api/__init__.py`.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && uv run pytest tests/api/test_health.py -v`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/pyproject.toml backend/app backend/tests
git commit -m "feat(backend): scaffold FastAPI app with config and health endpoint"
```

---

## Task 2: Enums + SM-2 spaced-repetition engine

Pure module — no DB, no HTTP. This is the core algorithm; test every branch.

**Files:**
- Create: `backend/app/enums.py`
- Create: `backend/app/services/__init__.py` (empty)
- Create: `backend/app/services/srs.py`
- Test: `backend/tests/unit/__init__.py` (empty), `backend/tests/unit/test_srs.py`

**Interfaces:**
- Produces:
  - `app.enums.Rating` (str Enum: `forgot`, `vague`, `remember`), `app.enums.ReviewMode` (str Enum: `flash`, `quiz`, `fill`).
  - `app.services.srs.Schedule` dataclass `(ease_factor: float, interval_days: int, repetitions: int, lapses: int)`.
  - `app.services.srs.review(sched: Schedule, rating: Rating) -> Schedule`.
  - `app.services.srs.mastery(repetitions: int, interval_days: int) -> str` (`"new"|"learning"|"proficient"`).

- [ ] **Step 1: Write the failing test**

`backend/tests/unit/test_srs.py`:
```python
from app.enums import Rating
from app.services.srs import Schedule, mastery, review

NEW = Schedule(ease_factor=2.5, interval_days=0, repetitions=0, lapses=0)


def test_first_remember_sets_interval_1_and_reps_1():
    out = review(NEW, Rating.remember)
    assert out.interval_days == 1
    assert out.repetitions == 1
    assert round(out.ease_factor, 2) == 2.6  # +0.1 for q=5


def test_second_remember_sets_interval_6():
    after_first = review(NEW, Rating.remember)
    out = review(after_first, Rating.remember)
    assert out.interval_days == 6
    assert out.repetitions == 2


def test_third_remember_multiplies_by_ease():
    s = Schedule(ease_factor=2.5, interval_days=6, repetitions=2, lapses=0)
    out = review(s, Rating.remember)
    assert out.interval_days == round(6 * out.ease_factor)
    assert out.repetitions == 3


def test_forgot_resets_reps_interval_and_increments_lapses():
    s = Schedule(ease_factor=2.5, interval_days=30, repetitions=5, lapses=1)
    out = review(s, Rating.forgot)
    assert out.repetitions == 0
    assert out.interval_days == 1
    assert out.lapses == 2
    assert out.ease_factor < 2.5  # q=2 lowers ease


def test_ease_never_below_1_3():
    s = Schedule(ease_factor=1.3, interval_days=1, repetitions=0, lapses=0)
    out = review(s, Rating.forgot)
    assert out.ease_factor >= 1.3


def test_vague_grows_reps_but_lowers_ease():
    out = review(NEW, Rating.vague)
    assert out.repetitions == 1
    assert out.interval_days == 1
    assert out.ease_factor < 2.5  # q=3 -> -0.14


def test_mastery_buckets():
    assert mastery(0, 0) == "new"
    assert mastery(1, 6) == "learning"
    assert mastery(3, 20) == "learning"
    assert mastery(3, 21) == "proficient"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run pytest tests/unit/test_srs.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.enums'`.

- [ ] **Step 3: Write enums + srs**

`backend/app/enums.py`:
```python
from enum import Enum


class Rating(str, Enum):
    forgot = "forgot"
    vague = "vague"
    remember = "remember"


class ReviewMode(str, Enum):
    flash = "flash"
    quiz = "quiz"
    fill = "fill"
```

`backend/app/services/srs.py`:
```python
from dataclasses import dataclass

from app.enums import Rating

# Grade -> SM-2 quality (0..5). forgot is a lapse (q < 3).
QUALITY: dict[Rating, int] = {Rating.forgot: 2, Rating.vague: 3, Rating.remember: 5}

LEARNING_INTERVAL_CEILING = 21  # days; >= this means "proficient"


@dataclass
class Schedule:
    ease_factor: float
    interval_days: int
    repetitions: int
    lapses: int


def review(sched: Schedule, rating: Rating) -> Schedule:
    q = QUALITY[rating]
    ease = sched.ease_factor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    ease = max(1.3, ease)

    if q < 3:
        return Schedule(ease_factor=ease, interval_days=1, repetitions=0, lapses=sched.lapses + 1)

    if sched.repetitions == 0:
        interval = 1
    elif sched.repetitions == 1:
        interval = 6
    else:
        interval = round(sched.interval_days * ease)

    return Schedule(
        ease_factor=ease,
        interval_days=interval,
        repetitions=sched.repetitions + 1,
        lapses=sched.lapses,
    )


def mastery(repetitions: int, interval_days: int) -> str:
    if repetitions == 0:
        return "new"
    if interval_days < LEARNING_INTERVAL_CEILING:
        return "learning"
    return "proficient"
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && uv run pytest tests/unit/test_srs.py -v`
Expected: PASS (7 passed).

- [ ] **Step 5: Commit**

```bash
git add backend/app/enums.py backend/app/services backend/tests/unit
git commit -m "feat(backend): SM-2 spaced-repetition engine (pure) with mastery buckets"
```

---

## Task 3: Database layer — models, async session, Alembic, Docker

Persistence foundation. Deliverable: models round-trip through a real Postgres test DB; Alembic can build the schema; `docker compose up` runs Postgres + API.

**Prerequisite:** Docker Desktop running. Tests need a Postgres test database (`TEST_DATABASE_URL`, default `postgresql+asyncpg://snoopify:snoopify@localhost:5432/snoopify_test`). Create it once after `db` is up:
`docker compose up -d db` then `docker compose exec db psql -U snoopify -c "CREATE DATABASE snoopify_test;"`

**Files:**
- Create: `backend/app/db/__init__.py` (empty), `backend/app/db/base.py`, `backend/app/db/session.py`, `backend/app/db/models.py`
- Create: `backend/app/api/deps.py`
- Create: `backend/.env.example`, `backend/Dockerfile`, `backend/docker-compose.yml`
- Create: `backend/alembic.ini`, `backend/migrations/env.py`, `backend/migrations/script.py.mako`
- Modify (replace): `backend/tests/conftest.py`
- Test: `backend/tests/api/test_models.py`

**Interfaces:**
- Produces:
  - `app.db.base.Base` (DeclarativeBase).
  - `app.db.models.Deck`, `Card`, `ReviewLog` (columns per spec §5).
  - `app.db.session.get_session()` async generator dependency; `app.db.session.engine`, `app.db.session.SessionLocal`.
  - `app.api.deps.SessionDep` = `Annotated[AsyncSession, Depends(get_session)]`.
  - pytest fixtures `engine`, `session` (`AsyncSession`), and an updated `client` whose `get_session` is overridden to the test DB.

- [ ] **Step 1: Write `Base`, models, session, deps**

`backend/app/db/base.py`:
```python
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass
```

`backend/app/db/models.py`:
```python
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum as SAEnum, Float, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.enums import Rating, ReviewMode


class Deck(Base):
    __tablename__ = "decks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False)
    topic: Mapped[str] = mapped_column(String, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    cards: Mapped[list["Card"]] = relationship(
        back_populates="deck", cascade="all, delete-orphan", lazy="selectin"
    )


class Card(Base):
    __tablename__ = "cards"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    deck_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("decks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    word: Mapped[str] = mapped_column(String, nullable=False)
    phonetic: Mapped[str] = mapped_column(String, nullable=False, default="")
    pos: Mapped[str] = mapped_column(String, nullable=False, default="")
    meaning: Mapped[str] = mapped_column(String, nullable=False, default="")
    example: Mapped[str] = mapped_column(String, nullable=False, default="")

    ease_factor: Mapped[float] = mapped_column(Float, nullable=False, default=2.5)
    interval_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    repetitions: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    lapses: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    due_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )
    last_reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    deck: Mapped["Deck"] = relationship(back_populates="cards")
    reviews: Mapped[list["ReviewLog"]] = relationship(
        back_populates="card", cascade="all, delete-orphan"
    )


class ReviewLog(Base):
    __tablename__ = "review_logs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    card_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("cards.id", ondelete="CASCADE"), nullable=False, index=True
    )
    rating: Mapped[Rating] = mapped_column(SAEnum(Rating, name="rating"), nullable=False)
    mode: Mapped[ReviewMode] = mapped_column(SAEnum(ReviewMode, name="review_mode"), nullable=False)
    is_correct: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    reviewed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), index=True
    )

    card: Mapped["Card"] = relationship(back_populates="reviews")
```

`backend/app/db/session.py`:
```python
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings

settings = get_settings()
connect_args = {"statement_cache_size": 0} if settings.db_disable_statement_cache else {}
engine = create_async_engine(settings.database_url, connect_args=connect_args)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        yield session
```

`backend/app/api/deps.py`:
```python
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session

SessionDep = Annotated[AsyncSession, Depends(get_session)]
```

- [ ] **Step 2: Replace `tests/conftest.py` with DB-aware fixtures**

`backend/tests/conftest.py`:
```python
import os

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.db import models  # noqa: F401  (register models on Base.metadata)
from app.db.base import Base
from app.db.session import get_session
from app.main import app

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://snoopify:snoopify@localhost:5432/snoopify_test",
)


@pytest_asyncio.fixture
async def engine():
    eng = create_async_engine(TEST_DATABASE_URL)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
async def session(engine):
    maker = async_sessionmaker(engine, expire_on_commit=False)
    async with maker() as s:
        yield s


@pytest_asyncio.fixture
async def client(engine):
    maker = async_sessionmaker(engine, expire_on_commit=False)

    async def _override():
        async with maker() as s:
            yield s

    app.dependency_overrides[get_session] = _override
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
```

- [ ] **Step 3: Write the failing test**

`backend/tests/api/test_models.py`:
```python
from sqlalchemy import select

from app.db.models import Card, Deck


async def test_deck_card_roundtrip_and_defaults(session):
    deck = Deck(name="Test", topic="từ vựng")
    deck.cards.append(Card(word="resilient", meaning="kiên cường"))
    session.add(deck)
    await session.commit()

    loaded = (await session.execute(select(Deck))).scalars().one()
    assert loaded.id is not None
    assert len(loaded.cards) == 1
    card = loaded.cards[0]
    assert card.ease_factor == 2.5
    assert card.interval_days == 0
    assert card.repetitions == 0
    assert card.lapses == 0
    assert card.due_at is not None  # server default now()
```

- [ ] **Step 4: Run test to verify it fails (no schema yet)**

Run: `cd backend && uv run pytest tests/api/test_models.py -v`
Expected: FAIL — connection error if Postgres isn't up, OR table errors. Start Postgres first (Step 5), then it fails only until models build correctly; here it should PASS once Postgres + the test DB exist. (If it errors on missing `snoopify_test`, create it per the prerequisite.)

- [ ] **Step 5: Write Docker + env so Postgres is available**

`backend/.env.example`:
```env
DATABASE_URL=postgresql+asyncpg://snoopify:snoopify@localhost:5432/snoopify
CORS_ORIGINS=["http://localhost:5173"]
APP_ENV=dev
APP_TIMEZONE=Asia/Ho_Chi_Minh
SEED_ON_STARTUP=false
# For Supabase pooler (pgbouncer): set DB_DISABLE_STATEMENT_CACHE=true and use the pooled URL with sslmode=require
DB_DISABLE_STATEMENT_CACHE=false
```

`backend/docker-compose.yml`:
```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: snoopify
      POSTGRES_PASSWORD: snoopify
      POSTGRES_DB: snoopify
    ports:
      - "5432:5432"
    volumes:
      - snoopify_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U snoopify"]
      interval: 5s
      timeout: 3s
      retries: 5

  api:
    build: .
    command: sh -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
    environment:
      DATABASE_URL: postgresql+asyncpg://snoopify:snoopify@db:5432/snoopify
    ports:
      - "8000:8000"
    volumes:
      - ./:/code
    depends_on:
      db:
        condition: service_healthy

volumes:
  snoopify_pgdata:
```

`backend/Dockerfile`:
```dockerfile
FROM python:3.12-slim
WORKDIR /code
RUN pip install --no-cache-dir uv
COPY pyproject.toml ./
RUN uv pip install --system -e ".[dev]" || uv sync
COPY . .
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Run: `cd backend && docker compose up -d db` and (once) `docker compose exec db psql -U snoopify -c "CREATE DATABASE snoopify_test;"`

- [ ] **Step 6: Run the model test to verify it passes**

Run: `cd backend && uv run pytest tests/api/test_models.py -v`
Expected: PASS.

- [ ] **Step 7: Configure Alembic and generate the initial migration**

`backend/alembic.ini` (minimal — the URL is injected from settings in `env.py`):
```ini
[alembic]
script_location = migrations

[loggers]
keys = root

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console

[handler_console]
class = StreamHandler
args = (sys.stderr,)
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
```

`backend/migrations/env.py`:
```python
import asyncio

from alembic import context
from sqlalchemy.ext.asyncio import create_async_engine

from app.config import get_settings
from app.db import models  # noqa: F401
from app.db.base import Base

config = context.config
target_metadata = Base.metadata


def _url() -> str:
    return get_settings().database_url


def run_migrations_offline() -> None:
    context.configure(url=_url(), target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def _do_run(connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    engine = create_async_engine(_url())
    async with engine.connect() as connection:
        await connection.run_sync(_do_run)
    await engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
```

`backend/migrations/script.py.mako`:
```mako
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}
"""
from alembic import op
import sqlalchemy as sa
${imports if imports else ""}

revision = ${repr(up_revision)}
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
```

Run: `cd backend && uv run alembic revision --autogenerate -m "initial schema"`
Then verify it applies on the dev DB: `uv run alembic upgrade head`
Expected: a file under `migrations/versions/` creating `decks`, `cards`, `review_logs` + enum types; `upgrade head` succeeds.

- [ ] **Step 8: Commit**

```bash
git add backend/app/db backend/app/api/deps.py backend/.env.example backend/Dockerfile backend/docker-compose.yml backend/alembic.ini backend/migrations backend/tests/conftest.py backend/tests/api/test_models.py
git commit -m "feat(backend): db models, async session, alembic, docker-compose"
```

---

## Task 4: Decks CRUD

**Files:**
- Create: `backend/app/schemas/__init__.py` (empty), `backend/app/schemas/deck.py`
- Create: `backend/app/schemas/card.py` (CardOut needed by deck detail)
- Create: `backend/app/services/decks.py`
- Create: `backend/app/api/routers/decks.py`
- Modify: `backend/app/api/router.py` (include decks router)
- Test: `backend/tests/api/test_decks.py`

**Interfaces:**
- Consumes: `SessionDep`, `Deck`, `Card`.
- Produces:
  - `schemas.card.CardOut` (Pydantic, `from_attributes=True`) — all `Card` columns.
  - `schemas.deck.DeckCreate {name: str, topic: str = ""}`, `DeckUpdate {name: str | None, topic: str | None}`, `DeckOut {id, name, topic, count: int, due_count: int, created_at, updated_at}`, `DeckDetailOut(DeckOut) {cards: list[CardOut]}`.
  - `services.decks`: `list_decks(session) -> list[DeckOut]`, `create_deck(session, data) -> DeckOut`, `get_deck(session, deck_id) -> Deck` (raises 404 via helper), `update_deck`, `delete_deck`.
- Routes: `GET /decks`, `POST /decks`, `GET /decks/{id}`, `PATCH /decks/{id}`, `DELETE /decks/{id}`.

- [ ] **Step 1: Write the failing test**

`backend/tests/api/test_decks.py`:
```python
async def test_create_list_get_update_delete_deck(client):
    # create
    r = await client.post("/decks", json={"name": "Business", "topic": "chủ đề"})
    assert r.status_code == 201
    deck = r.json()
    did = deck["id"]
    assert deck["name"] == "Business"
    assert deck["count"] == 0
    assert deck["due_count"] == 0

    # list
    r = await client.get("/decks")
    assert r.status_code == 200
    assert len(r.json()) == 1

    # get detail
    r = await client.get(f"/decks/{did}")
    assert r.status_code == 200
    assert r.json()["cards"] == []

    # update
    r = await client.patch(f"/decks/{did}", json={"name": "Business English"})
    assert r.status_code == 200
    assert r.json()["name"] == "Business English"

    # delete
    r = await client.delete(f"/decks/{did}")
    assert r.status_code == 204
    r = await client.get(f"/decks/{did}")
    assert r.status_code == 404


async def test_get_missing_deck_404(client):
    r = await client.get("/decks/00000000-0000-0000-0000-000000000000")
    assert r.status_code == 404
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run pytest tests/api/test_decks.py -v`
Expected: FAIL — 404 for all routes (decks router not mounted) / import errors.

- [ ] **Step 3: Write schemas**

`backend/app/schemas/card.py`:
```python
import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CardOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    deck_id: uuid.UUID
    word: str
    phonetic: str
    pos: str
    meaning: str
    example: str
    ease_factor: float
    interval_days: int
    repetitions: int
    lapses: int
    due_at: datetime
    last_reviewed_at: datetime | None
    created_at: datetime
    updated_at: datetime
```

`backend/app/schemas/deck.py`:
```python
import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.card import CardOut


class DeckCreate(BaseModel):
    name: str
    topic: str = ""


class DeckUpdate(BaseModel):
    name: str | None = None
    topic: str | None = None


class DeckOut(BaseModel):
    id: uuid.UUID
    name: str
    topic: str
    count: int
    due_count: int
    created_at: datetime
    updated_at: datetime


class DeckDetailOut(DeckOut):
    cards: list[CardOut]
```

- [ ] **Step 4: Write the service**

`backend/app/services/decks.py`:
```python
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select

from app.db.models import Card, Deck
from app.schemas.deck import DeckCreate, DeckDetailOut, DeckOut, DeckUpdate
from app.schemas.card import CardOut


def _due_count(deck: Deck, now: datetime) -> int:
    return sum(1 for c in deck.cards if c.due_at <= now)


def _to_out(deck: Deck, now: datetime) -> DeckOut:
    return DeckOut(
        id=deck.id,
        name=deck.name,
        topic=deck.topic,
        count=len(deck.cards),
        due_count=_due_count(deck, now),
        created_at=deck.created_at,
        updated_at=deck.updated_at,
    )


async def _get_or_404(session, deck_id: uuid.UUID) -> Deck:
    deck = await session.get(Deck, deck_id)
    if deck is None:
        raise HTTPException(status_code=404, detail="Deck not found")
    return deck


async def list_decks(session) -> list[DeckOut]:
    now = datetime.now(timezone.utc)
    decks = (await session.execute(select(Deck))).scalars().all()
    return [_to_out(d, now) for d in decks]


async def create_deck(session, data: DeckCreate) -> DeckOut:
    deck = Deck(name=data.name, topic=data.topic)
    session.add(deck)
    await session.commit()
    await session.refresh(deck, attribute_names=["cards"])
    return _to_out(deck, datetime.now(timezone.utc))


async def get_deck_detail(session, deck_id: uuid.UUID) -> DeckDetailOut:
    deck = await _get_or_404(session, deck_id)
    now = datetime.now(timezone.utc)
    base = _to_out(deck, now)
    return DeckDetailOut(**base.model_dump(), cards=[CardOut.model_validate(c) for c in deck.cards])


async def update_deck(session, deck_id: uuid.UUID, data: DeckUpdate) -> DeckOut:
    deck = await _get_or_404(session, deck_id)
    if data.name is not None:
        deck.name = data.name
    if data.topic is not None:
        deck.topic = data.topic
    await session.commit()
    await session.refresh(deck, attribute_names=["cards"])
    return _to_out(deck, datetime.now(timezone.utc))


async def delete_deck(session, deck_id: uuid.UUID) -> None:
    deck = await _get_or_404(session, deck_id)
    await session.delete(deck)
    await session.commit()
```

- [ ] **Step 5: Write the router and mount it**

`backend/app/api/routers/decks.py`:
```python
import uuid

from fastapi import APIRouter, status

from app.api.deps import SessionDep
from app.schemas.deck import DeckCreate, DeckDetailOut, DeckOut, DeckUpdate
from app.services import decks as svc

router = APIRouter(prefix="/decks", tags=["decks"])


@router.get("", response_model=list[DeckOut])
async def list_decks(session: SessionDep):
    return await svc.list_decks(session)


@router.post("", response_model=DeckOut, status_code=status.HTTP_201_CREATED)
async def create_deck(data: DeckCreate, session: SessionDep):
    return await svc.create_deck(session, data)


@router.get("/{deck_id}", response_model=DeckDetailOut)
async def get_deck(deck_id: uuid.UUID, session: SessionDep):
    return await svc.get_deck_detail(session, deck_id)


@router.patch("/{deck_id}", response_model=DeckOut)
async def update_deck(deck_id: uuid.UUID, data: DeckUpdate, session: SessionDep):
    return await svc.update_deck(session, deck_id, data)


@router.delete("/{deck_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_deck(deck_id: uuid.UUID, session: SessionDep):
    await svc.delete_deck(session, deck_id)
```

Modify `backend/app/api/router.py` — add the import and include:
```python
from app.api.routers import decks, health

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(decks.router)
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && uv run pytest tests/api/test_decks.py -v`
Expected: PASS (2 passed).

- [ ] **Step 7: Commit**

```bash
git add backend/app/schemas backend/app/services/decks.py backend/app/api/routers/decks.py backend/app/api/router.py backend/tests/api/test_decks.py
git commit -m "feat(backend): decks CRUD endpoints"
```

---

## Task 5: Cards CRUD

**Files:**
- Create: `backend/app/services/cards.py`
- Create: `backend/app/api/routers/cards.py`
- Modify: `backend/app/schemas/card.py` (add `CardCreate`, `CardUpdate`)
- Modify: `backend/app/api/router.py` (include cards router)
- Test: `backend/tests/api/test_cards.py`

**Interfaces:**
- Consumes: `SessionDep`, `Card`, `services.decks._get_or_404`, `CardOut`.
- Produces:
  - `schemas.card.CardCreate {word: str, phonetic="", pos="", meaning="", example=""}`, `CardUpdate` (all 5 optional).
  - `services.cards`: `list_cards(session, deck_id) -> list[Card]`, `add_card(session, deck_id, data) -> Card`, `get_card_or_404(session, card_id) -> Card`, `update_card`, `delete_card`.
- Routes: `GET /decks/{id}/cards`, `POST /decks/{id}/cards`, `GET /cards/{id}`, `PATCH /cards/{id}`, `DELETE /cards/{id}`.

- [ ] **Step 1: Write the failing test**

`backend/tests/api/test_cards.py`:
```python
import pytest_asyncio


@pytest_asyncio.fixture
async def deck_id(client):
    r = await client.post("/decks", json={"name": "Deck", "topic": "t"})
    return r.json()["id"]


async def test_add_list_get_update_delete_card(client, deck_id):
    payload = {"word": "resilient", "phonetic": "/rɪ/", "pos": "adjective",
               "meaning": "kiên cường", "example": "She is resilient."}
    r = await client.post(f"/decks/{deck_id}/cards", json=payload)
    assert r.status_code == 201
    card = r.json()
    cid = card["id"]
    assert card["word"] == "resilient"
    assert card["ease_factor"] == 2.5

    r = await client.get(f"/decks/{deck_id}/cards")
    assert r.status_code == 200
    assert len(r.json()) == 1

    r = await client.patch(f"/cards/{cid}", json={"meaning": "có khả năng phục hồi"})
    assert r.status_code == 200
    assert r.json()["meaning"] == "có khả năng phục hồi"

    r = await client.delete(f"/cards/{cid}")
    assert r.status_code == 204
    r = await client.get(f"/cards/{cid}")
    assert r.status_code == 404


async def test_add_card_to_missing_deck_404(client):
    r = await client.post(
        "/decks/00000000-0000-0000-0000-000000000000/cards", json={"word": "x"}
    )
    assert r.status_code == 404
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run pytest tests/api/test_cards.py -v`
Expected: FAIL — routes not mounted.

- [ ] **Step 3: Add card schemas**

Append to `backend/app/schemas/card.py`:
```python
class CardCreate(BaseModel):
    word: str
    phonetic: str = ""
    pos: str = ""
    meaning: str = ""
    example: str = ""


class CardUpdate(BaseModel):
    word: str | None = None
    phonetic: str | None = None
    pos: str | None = None
    meaning: str | None = None
    example: str | None = None
```

- [ ] **Step 4: Write the service**

`backend/app/services/cards.py`:
```python
import uuid

from fastapi import HTTPException
from sqlalchemy import select

from app.db.models import Card
from app.schemas.card import CardCreate, CardUpdate
from app.services.decks import _get_or_404 as _get_deck_or_404


async def get_card_or_404(session, card_id: uuid.UUID) -> Card:
    card = await session.get(Card, card_id)
    if card is None:
        raise HTTPException(status_code=404, detail="Card not found")
    return card


async def list_cards(session, deck_id: uuid.UUID) -> list[Card]:
    await _get_deck_or_404(session, deck_id)
    rows = await session.execute(select(Card).where(Card.deck_id == deck_id))
    return list(rows.scalars().all())


async def add_card(session, deck_id: uuid.UUID, data: CardCreate) -> Card:
    await _get_deck_or_404(session, deck_id)
    card = Card(deck_id=deck_id, **data.model_dump())
    session.add(card)
    await session.commit()
    await session.refresh(card)
    return card


async def update_card(session, card_id: uuid.UUID, data: CardUpdate) -> Card:
    card = await get_card_or_404(session, card_id)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(card, field, value)
    await session.commit()
    await session.refresh(card)
    return card


async def delete_card(session, card_id: uuid.UUID) -> None:
    card = await get_card_or_404(session, card_id)
    await session.delete(card)
    await session.commit()
```

- [ ] **Step 5: Write the router and mount it**

`backend/app/api/routers/cards.py`:
```python
import uuid

from fastapi import APIRouter, status

from app.api.deps import SessionDep
from app.schemas.card import CardCreate, CardOut, CardUpdate
from app.services import cards as svc

# Two prefixes share one module: deck-scoped collection + flat item routes.
deck_cards_router = APIRouter(prefix="/decks", tags=["cards"])
cards_router = APIRouter(prefix="/cards", tags=["cards"])


@deck_cards_router.get("/{deck_id}/cards", response_model=list[CardOut])
async def list_cards(deck_id: uuid.UUID, session: SessionDep):
    return await svc.list_cards(session, deck_id)


@deck_cards_router.post(
    "/{deck_id}/cards", response_model=CardOut, status_code=status.HTTP_201_CREATED
)
async def add_card(deck_id: uuid.UUID, data: CardCreate, session: SessionDep):
    return await svc.add_card(session, deck_id, data)


@cards_router.get("/{card_id}", response_model=CardOut)
async def get_card(card_id: uuid.UUID, session: SessionDep):
    return await svc.get_card_or_404(session, card_id)


@cards_router.patch("/{card_id}", response_model=CardOut)
async def update_card(card_id: uuid.UUID, data: CardUpdate, session: SessionDep):
    return await svc.update_card(session, card_id, data)


@cards_router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_card(card_id: uuid.UUID, session: SessionDep):
    await svc.delete_card(session, card_id)
```

Modify `backend/app/api/router.py`:
```python
from app.api.routers import cards, decks, health

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(decks.router)
api_router.include_router(cards.deck_cards_router)
api_router.include_router(cards.cards_router)
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && uv run pytest tests/api/test_cards.py -v`
Expected: PASS (2 passed).

- [ ] **Step 7: Commit**

```bash
git add backend/app/services/cards.py backend/app/api/routers/cards.py backend/app/schemas/card.py backend/app/api/router.py backend/tests/api/test_cards.py
git commit -m "feat(backend): cards CRUD endpoints"
```

---

## Task 6: JSON import (`POST /decks/import`)

Ports the FE `parseAndImport` semantics. Validation is a pure function (unit-tested); the endpoint persists.

**Files:**
- Create: `backend/app/services/importer.py`
- Modify: `backend/app/api/routers/decks.py` (add import route)
- Test: `backend/tests/unit/test_importer.py`, `backend/tests/api/test_import.py`

**Interfaces:**
- Consumes: `SessionDep`, `Deck`, `Card`, `DeckOut`, `services.decks._to_out`.
- Produces:
  - `services.importer.INVALID_MSG` (verbatim FE string).
  - `services.importer.ParsedCard`, `ParsedDeck` dataclasses.
  - `services.importer.parse_import(data: dict) -> ParsedDeck` (raises `ValueError(INVALID_MSG)` on bad input).
  - `services.importer.import_deck(session, data: dict) -> DeckOut`.
  - Route `POST /decks/import` → `200 {ok: true, msg: str, deck: DeckOut}`; on invalid → `400 {ok: false, msg: INVALID_MSG}`.

- [ ] **Step 1: Write the failing unit test**

`backend/tests/unit/test_importer.py`:
```python
import pytest

from app.services.importer import INVALID_MSG, parse_import


def test_parse_valid_uses_deck_key_and_filters_cards_without_word():
    data = {"deck": "Biz", "topic": "chủ đề",
            "cards": [{"word": "a", "meaning": "m"}, {"meaning": "no word"}]}
    parsed = parse_import(data)
    assert parsed.name == "Biz"
    assert parsed.topic == "chủ đề"
    assert len(parsed.cards) == 1
    assert parsed.cards[0].word == "a"


def test_parse_accepts_name_key_as_fallback():
    parsed = parse_import({"name": "X", "cards": [{"word": "a"}]})
    assert parsed.name == "X"


def test_parse_missing_name_raises():
    with pytest.raises(ValueError) as e:
        parse_import({"cards": [{"word": "a"}]})
    assert str(e.value) == INVALID_MSG


def test_parse_empty_cards_raises():
    with pytest.raises(ValueError):
        parse_import({"deck": "X", "cards": []})


def test_parse_all_cards_missing_word_raises():
    with pytest.raises(ValueError):
        parse_import({"deck": "X", "cards": [{"meaning": "m"}]})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run pytest tests/unit/test_importer.py -v`
Expected: FAIL — `ModuleNotFoundError: app.services.importer`.

- [ ] **Step 3: Write the importer**

`backend/app/services/importer.py`:
```python
from dataclasses import dataclass
from datetime import datetime, timezone

from app.db.models import Card, Deck
from app.schemas.deck import DeckOut
from app.services.decks import _to_out

INVALID_MSG = "JSON không hợp lệ hoặc thiếu trường bắt buộc (deck, cards[].word)."


@dataclass
class ParsedCard:
    word: str
    phonetic: str
    pos: str
    meaning: str
    example: str


@dataclass
class ParsedDeck:
    name: str
    topic: str
    cards: list[ParsedCard]


def parse_import(data: dict) -> ParsedDeck:
    if not isinstance(data, dict):
        raise ValueError(INVALID_MSG)
    name = data.get("deck") or data.get("name")
    cards = data.get("cards")
    if not name or not isinstance(cards, list) or len(cards) == 0:
        raise ValueError(INVALID_MSG)
    clean: list[ParsedCard] = []
    for c in cards:
        if isinstance(c, dict) and c.get("word"):
            clean.append(
                ParsedCard(
                    word=str(c["word"]),
                    phonetic=c.get("phonetic") or "",
                    pos=c.get("pos") or "",
                    meaning=c.get("meaning") or "",
                    example=c.get("example") or "",
                )
            )
    if not clean:
        raise ValueError(INVALID_MSG)
    return ParsedDeck(name=str(name), topic=data.get("topic") or "", cards=clean)


async def import_deck(session, data: dict) -> DeckOut:
    parsed = parse_import(data)
    deck = Deck(name=parsed.name, topic=parsed.topic)
    for c in parsed.cards:
        deck.cards.append(
            Card(word=c.word, phonetic=c.phonetic, pos=c.pos, meaning=c.meaning, example=c.example)
        )
    session.add(deck)
    await session.commit()
    await session.refresh(deck, attribute_names=["cards"])
    return _to_out(deck, datetime.now(timezone.utc))
```

- [ ] **Step 4: Run unit test to verify it passes**

Run: `cd backend && uv run pytest tests/unit/test_importer.py -v`
Expected: PASS (5 passed).

- [ ] **Step 5: Add the import route**

Modify `backend/app/api/routers/decks.py` — add imports and route:
```python
from fastapi import APIRouter, Body, status
from fastapi.responses import JSONResponse

from app.services import importer
```
```python
@router.post("/import")
async def import_deck(session: SessionDep, payload: dict = Body(...)):
    try:
        deck = await importer.import_deck(session, payload)
    except ValueError as exc:
        return JSONResponse(status_code=400, content={"ok": False, "msg": str(exc)})
    return {
        "ok": True,
        "msg": f'Đã nhập "{deck.name}" · {deck.count} thẻ',
        "deck": deck.model_dump(mode="json"),
    }
```
Note: define this route **before** `GET /decks/{deck_id}` is fine (POST vs GET differ), but to avoid any path ambiguity place `import` route literally above the `{deck_id}` routes in the file.

- [ ] **Step 6: Write the API test**

`backend/tests/api/test_import.py`:
```python
async def test_import_valid_deck(client):
    body = {"deck": "Business English", "topic": "chủ đề",
            "cards": [{"word": "resilient", "meaning": "kiên cường"},
                      {"meaning": "no word — filtered"}]}
    r = await client.post("/decks/import", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert data["deck"]["count"] == 1
    assert "Business English" in data["msg"]


async def test_import_invalid_returns_400_with_fe_message(client):
    r = await client.post("/decks/import", json={"cards": []})
    assert r.status_code == 400
    assert r.json()["ok"] is False
    assert "thiếu trường bắt buộc" in r.json()["msg"]
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd backend && uv run pytest tests/api/test_import.py -v`
Expected: PASS (2 passed).

- [ ] **Step 8: Commit**

```bash
git add backend/app/services/importer.py backend/app/api/routers/decks.py backend/tests/unit/test_importer.py backend/tests/api/test_import.py
git commit -m "feat(backend): JSON deck import endpoint"
```

---

## Task 7: Review session assembly + quiz/fill generation

Generation functions are pure (take card-like objects, accept a seeded RNG) so they are deterministic in tests. The endpoint returns due cards with generated quiz + fill.

**Files:**
- Create: `backend/app/schemas/review.py`
- Create: `backend/app/services/review.py`
- Create: `backend/app/api/routers/review.py`
- Modify: `backend/app/api/router.py` (include review router)
- Test: `backend/tests/unit/test_review_gen.py`, `backend/tests/api/test_review.py`

**Interfaces:**
- Consumes: `SessionDep`, `Card`.
- Produces:
  - `schemas.review.QuizOption {key: str, text: str}`, `QuizOut {options: list[QuizOption], correct_key: str}`, `FillOut {before, after, answer, hint: str}`, `ReviewItemOut {card_id: uuid, word, phonetic, pos, meaning, example, quiz: QuizOut, fill: FillOut}`.
  - `services.review.build_quiz(card, pool, rng=None) -> dict` (keys `options`, `correct_key`).
  - `services.review.build_fill(card) -> dict` (keys `before, after, answer, hint`).
  - `services.review.assemble_session(session, deck_id: uuid | None, limit: int) -> list[ReviewItemOut]`.
- Route: `GET /review/session?deck_id=&limit=20`.

- [ ] **Step 1: Write the failing unit test**

`backend/tests/unit/test_review_gen.py`:
```python
import random
from dataclasses import dataclass

from app.services.review import build_fill, build_quiz


@dataclass
class FakeCard:
    word: str = ""
    meaning: str = ""
    example: str = ""


def test_build_quiz_includes_correct_and_up_to_four_options():
    card = FakeCard(word="resilient", meaning="kiên cường")
    pool = [FakeCard(meaning="mong manh"), FakeCard(meaning="cứng nhắc"),
            FakeCard(meaning="hào phóng"), FakeCard(meaning="vội vàng")]
    q = build_quiz(card, pool, rng=random.Random(0))
    assert len(q["options"]) == 4
    correct = next(o for o in q["options"] if o["key"] == q["correct_key"])
    assert correct["text"] == "kiên cường"


def test_build_quiz_dedupes_and_handles_small_pool():
    card = FakeCard(word="x", meaning="đúng")
    pool = [FakeCard(meaning="đúng"), FakeCard(meaning="khác")]  # dup of correct + 1
    q = build_quiz(card, pool, rng=random.Random(1))
    texts = [o["text"] for o in q["options"]]
    assert texts.count("đúng") == 1  # correct only once, dup filtered
    assert "khác" in texts


def test_build_fill_splits_example_and_makes_hint():
    card = FakeCard(word="resilient", example="She is so resilient today.")
    f = build_fill(card)
    assert f["before"] == "She is so "
    assert f["after"] == " today."
    assert f["answer"] == "resilient"
    assert f["hint"] == "r________"


def test_build_fill_per_word_hint_for_phrase():
    card = FakeCard(word="put off", example="Don't put off your work.")
    f = build_fill(card)
    assert f["hint"] == "p__ o__"


def test_build_fill_fallback_when_word_absent():
    card = FakeCard(word="serendipity", meaning="duyên may", example="No match here.")
    f = build_fill(card)
    assert f["before"] == "" and f["after"] == ""
    assert f["answer"] == "serendipity"
    assert f["hint"] == "duyên may"
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run pytest tests/unit/test_review_gen.py -v`
Expected: FAIL — `ModuleNotFoundError: app.services.review`.

- [ ] **Step 3: Write generation + assembly service**

`backend/app/services/review.py`:
```python
import random
import uuid
from datetime import datetime, timezone

from sqlalchemy import select

from app.db.models import Card
from app.schemas.review import FillOut, QuizOption, QuizOut, ReviewItemOut

_KEYS = ["A", "B", "C", "D"]


def _hint(answer: str) -> str:
    return " ".join((w[0] + "_" * (len(w) - 1)) if w else "" for w in answer.split(" "))


def build_quiz(card, pool, rng: random.Random | None = None) -> dict:
    rng = rng or random.Random()
    correct = card.meaning
    seen = {correct}
    distinct: list[str] = []
    for c in pool:
        m = getattr(c, "meaning", "")
        if m and m not in seen:
            seen.add(m)
            distinct.append(m)
    rng.shuffle(distinct)
    options_text = distinct[:3] + [correct]
    rng.shuffle(options_text)
    options = [{"key": _KEYS[i], "text": t} for i, t in enumerate(options_text)]
    correct_key = next(o["key"] for o in options if o["text"] == correct)
    return {"options": options, "correct_key": correct_key}


def build_fill(card) -> dict:
    word = card.word or ""
    example = card.example or ""

    def found(idx: int, target: str) -> dict:
        return {
            "before": example[:idx],
            "after": example[idx + len(target):],
            "answer": target,
            "hint": _hint(target),
        }

    if word:
        idx = example.find(word)
        if idx != -1:
            return found(idx, example[idx:idx + len(word)])
        idx = example.lower().find(word.lower())
        if idx != -1:
            return found(idx, example[idx:idx + len(word)])
        if word.lower().startswith("to "):
            base = word[3:]
            idx = example.lower().find(base.lower())
            if idx != -1:
                return found(idx, example[idx:idx + len(base)])

    # fallback: no in-sentence match -> prompt with the meaning
    return {"before": "", "after": "", "answer": word, "hint": card.meaning or _hint(word)}


def _to_item(card: Card, pool: list[Card]) -> ReviewItemOut:
    quiz = build_quiz(card, [c for c in pool if c.id != card.id])
    fill = build_fill(card)
    return ReviewItemOut(
        card_id=card.id,
        word=card.word,
        phonetic=card.phonetic,
        pos=card.pos,
        meaning=card.meaning,
        example=card.example,
        quiz=QuizOut(options=[QuizOption(**o) for o in quiz["options"]], correct_key=quiz["correct_key"]),
        fill=FillOut(**fill),
    )


async def assemble_session(session, deck_id: uuid.UUID | None, limit: int) -> list[ReviewItemOut]:
    now = datetime.now(timezone.utc)
    stmt = select(Card).where(Card.due_at <= now)
    if deck_id is not None:
        stmt = stmt.where(Card.deck_id == deck_id)
    stmt = stmt.order_by(Card.due_at).limit(limit)
    due = list((await session.execute(stmt)).scalars().all())

    # distractor pool: prefer same-deck cards, fall back to all cards
    pool_stmt = select(Card)
    if deck_id is not None:
        pool_stmt = pool_stmt.where(Card.deck_id == deck_id)
    pool = list((await session.execute(pool_stmt)).scalars().all())
    if len({c.meaning for c in pool}) < 4:
        pool = list((await session.execute(select(Card))).scalars().all())

    return [_to_item(c, pool) for c in due]
```

`backend/app/schemas/review.py`:
```python
import uuid

from pydantic import BaseModel


class QuizOption(BaseModel):
    key: str
    text: str


class QuizOut(BaseModel):
    options: list[QuizOption]
    correct_key: str


class FillOut(BaseModel):
    before: str
    after: str
    answer: str
    hint: str


class ReviewItemOut(BaseModel):
    card_id: uuid.UUID
    word: str
    phonetic: str
    pos: str
    meaning: str
    example: str
    quiz: QuizOut
    fill: FillOut
```

- [ ] **Step 4: Run unit test to verify it passes**

Run: `cd backend && uv run pytest tests/unit/test_review_gen.py -v`
Expected: PASS (5 passed).

- [ ] **Step 5: Write the router and mount it**

`backend/app/api/routers/review.py`:
```python
import uuid

from fastapi import APIRouter, Query

from app.api.deps import SessionDep
from app.schemas.review import ReviewItemOut
from app.services import review as svc

router = APIRouter(prefix="/review", tags=["review"])


@router.get("/session", response_model=list[ReviewItemOut])
async def get_session(
    session: SessionDep,
    deck_id: uuid.UUID | None = None,
    limit: int = Query(default=20, ge=1, le=100),
):
    return await svc.assemble_session(session, deck_id, limit)
```

Modify `backend/app/api/router.py`:
```python
from app.api.routers import cards, decks, health, review

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(decks.router)
api_router.include_router(cards.deck_cards_router)
api_router.include_router(cards.cards_router)
api_router.include_router(review.router)
```

- [ ] **Step 6: Write the API test**

`backend/tests/api/test_review.py`:
```python
import pytest_asyncio

CARDS = [
    {"word": "resilient", "meaning": "kiên cường", "example": "She is resilient today."},
    {"word": "serendipity", "meaning": "duyên may", "example": "Pure serendipity here."},
    {"word": "meticulous", "meaning": "tỉ mỉ", "example": "He is meticulous."},
    {"word": "ambiguous", "meaning": "mơ hồ", "example": "It was ambiguous."},
]


@pytest_asyncio.fixture
async def deck_with_cards(client):
    did = (await client.post("/decks", json={"name": "D", "topic": "t"})).json()["id"]
    for c in CARDS:
        await client.post(f"/decks/{did}/cards", json=c)
    return did


async def test_session_returns_due_cards_with_quiz_and_fill(client, deck_with_cards):
    r = await client.get("/review/session")
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 4  # all new cards are due immediately
    first = items[0]
    assert "quiz" in first and "fill" in first
    assert len(first["quiz"]["options"]) == 4
    keys = [o["key"] for o in first["quiz"]["options"]]
    assert first["quiz"]["correct_key"] in keys
```

- [ ] **Step 7: Run test to verify it passes**

Run: `cd backend && uv run pytest tests/api/test_review.py -v`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/app/schemas/review.py backend/app/services/review.py backend/app/api/routers/review.py backend/app/api/router.py backend/tests/unit/test_review_gen.py backend/tests/api/test_review.py
git commit -m "feat(backend): review session assembly with quiz/fill generation"
```

---

## Task 8: Grade endpoint (`POST /review/grade`)

Wires `srs.review` to a card, persists the new schedule, and writes a `review_log`.

**Files:**
- Modify: `backend/app/schemas/review.py` (add `GradeRequest`, `GradeResult`)
- Modify: `backend/app/services/review.py` (add `grade_card`)
- Modify: `backend/app/api/routers/review.py` (add route)
- Test: `backend/tests/api/test_grade.py`

**Interfaces:**
- Consumes: `SessionDep`, `Card`, `ReviewLog`, `srs.Schedule`, `srs.review`, `services.cards.get_card_or_404`.
- Produces:
  - `schemas.review.GradeRequest {card_id: uuid, rating: Rating, mode: ReviewMode, is_correct: bool | None = None}`.
  - `schemas.review.GradeResult {card_id: uuid, ease_factor: float, interval_days: int, repetitions: int, lapses: int, due_at: datetime, last_reviewed_at: datetime}`.
  - `services.review.grade_card(session, req: GradeRequest) -> GradeResult`.
- Route: `POST /review/grade`.

- [ ] **Step 1: Write the failing test**

`backend/tests/api/test_grade.py`:
```python
import pytest_asyncio


@pytest_asyncio.fixture
async def card_id(client):
    did = (await client.post("/decks", json={"name": "D", "topic": "t"})).json()["id"]
    return (await client.post(f"/decks/{did}/cards",
            json={"word": "resilient", "meaning": "kiên cường"})).json()["id"]


async def test_grade_remember_advances_schedule(client, card_id):
    r = await client.post("/review/grade",
                          json={"card_id": card_id, "rating": "remember", "mode": "flash"})
    assert r.status_code == 200
    body = r.json()
    assert body["repetitions"] == 1
    assert body["interval_days"] == 1
    # card is no longer due now (due_at moved into the future)
    s = await client.get("/review/session")
    assert all(item["card_id"] != card_id for item in s.json())


async def test_grade_forgot_increments_lapses(client, card_id):
    r = await client.post("/review/grade",
                          json={"card_id": card_id, "rating": "forgot", "mode": "quiz",
                                "is_correct": False})
    assert r.status_code == 200
    assert r.json()["lapses"] == 1
    assert r.json()["interval_days"] == 1


async def test_grade_missing_card_404(client):
    r = await client.post("/review/grade",
                          json={"card_id": "00000000-0000-0000-0000-000000000000",
                                "rating": "remember", "mode": "flash"})
    assert r.status_code == 404
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run pytest tests/api/test_grade.py -v`
Expected: FAIL — route missing (404 / validation).

- [ ] **Step 3: Add schemas**

Append to `backend/app/schemas/review.py`:
```python
from datetime import datetime

from app.enums import Rating, ReviewMode


class GradeRequest(BaseModel):
    card_id: uuid.UUID
    rating: Rating
    mode: ReviewMode
    is_correct: bool | None = None


class GradeResult(BaseModel):
    card_id: uuid.UUID
    ease_factor: float
    interval_days: int
    repetitions: int
    lapses: int
    due_at: datetime
    last_reviewed_at: datetime
```

- [ ] **Step 4: Add the service function**

Append to `backend/app/services/review.py`:
```python
from datetime import timedelta

from app.db.models import ReviewLog
from app.schemas.review import GradeRequest, GradeResult
from app.services import srs
from app.services.cards import get_card_or_404


async def grade_card(session, req: GradeRequest) -> GradeResult:
    card = await get_card_or_404(session, req.card_id)
    new = srs.review(
        srs.Schedule(
            ease_factor=card.ease_factor,
            interval_days=card.interval_days,
            repetitions=card.repetitions,
            lapses=card.lapses,
        ),
        req.rating,
    )
    now = datetime.now(timezone.utc)
    card.ease_factor = new.ease_factor
    card.interval_days = new.interval_days
    card.repetitions = new.repetitions
    card.lapses = new.lapses
    card.last_reviewed_at = now
    card.due_at = now + timedelta(days=new.interval_days)

    session.add(ReviewLog(card_id=card.id, rating=req.rating, mode=req.mode, is_correct=req.is_correct))
    await session.commit()
    await session.refresh(card)
    return GradeResult(
        card_id=card.id,
        ease_factor=card.ease_factor,
        interval_days=card.interval_days,
        repetitions=card.repetitions,
        lapses=card.lapses,
        due_at=card.due_at,
        last_reviewed_at=card.last_reviewed_at,
    )
```
(Move the `from datetime import timedelta` / `timezone` imports to the top of the file if a linter complains; they may already be imported.)

- [ ] **Step 5: Add the route**

Modify `backend/app/api/routers/review.py` — add imports and route:
```python
from app.schemas.review import GradeRequest, GradeResult, ReviewItemOut
```
```python
@router.post("/grade", response_model=GradeResult)
async def grade(req: GradeRequest, session: SessionDep):
    return await svc.grade_card(session, req)
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && uv run pytest tests/api/test_grade.py -v`
Expected: PASS (3 passed).

- [ ] **Step 7: Commit**

```bash
git add backend/app/schemas/review.py backend/app/services/review.py backend/app/api/routers/review.py backend/tests/api/test_grade.py
git commit -m "feat(backend): grade endpoint applies SM-2 and logs review"
```

---

## Task 9: Progress, dashboard & stats endpoints

All derived from the three tables; day boundaries in `APP_TIMEZONE`.

**Files:**
- Create: `backend/app/schemas/progress.py`
- Create: `backend/app/services/progress.py`
- Create: `backend/app/api/routers/progress.py`
- Modify: `backend/app/api/router.py` (include progress router)
- Test: `backend/tests/api/test_progress.py`

**Interfaces:**
- Consumes: `SessionDep`, `Card`, `ReviewLog`, `srs.mastery`, `get_settings`.
- Produces:
  - `schemas.progress`: `MasteryCounts {new, learning, proficient: int}`, `WeeklyBar {label: str, count: int}`, `ProgressSummaryOut {streak, reviews_today, mastery: MasteryCounts, weekly_bars: list[WeeklyBar], due_total: int}`, `HeatmapOut {cells: list[int]}`, `NeedsReviewItem {card_id: uuid, word: str, lapses: int}`, `WordOfDayOut {card_id, word, phonetic, pos, meaning, example}`.
  - `services.progress`: `summary(session) -> ProgressSummaryOut`, `heatmap(session) -> HeatmapOut`, `needs_review(session, limit=10) -> list[NeedsReviewItem]`, `word_of_day(session) -> WordOfDayOut | None`, `recent_cards(session, limit=3) -> list[CardOut]`.
- Routes: `GET /progress/summary`, `GET /progress/heatmap`, `GET /progress/needs-review`, `GET /dashboard/word-of-day`, `GET /cards/recent`.

- [ ] **Step 1: Write the failing test**

`backend/tests/api/test_progress.py`:
```python
import pytest_asyncio


@pytest_asyncio.fixture
async def seeded(client):
    did = (await client.post("/decks", json={"name": "D", "topic": "t"})).json()["id"]
    ids = []
    for w, m in [("resilient", "kiên cường"), ("serendipity", "duyên may"),
                 ("meticulous", "tỉ mỉ"), ("ambiguous", "mơ hồ")]:
        ids.append((await client.post(f"/decks/{did}/cards",
                    json={"word": w, "meaning": m})).json()["id"])
    return ids


async def test_summary_reflects_grades(client, seeded):
    before = (await client.get("/progress/summary")).json()
    assert before["mastery"]["new"] == 4
    assert before["due_total"] == 4

    await client.post("/review/grade", json={"card_id": seeded[0], "rating": "remember", "mode": "flash"})
    after = (await client.get("/progress/summary")).json()
    assert after["reviews_today"] == 1
    assert after["streak"] >= 1
    assert after["mastery"]["new"] == 3
    assert len(after["weekly_bars"]) == 7


async def test_heatmap_has_126_cells(client, seeded):
    r = await client.get("/progress/heatmap")
    assert r.status_code == 200
    cells = r.json()["cells"]
    assert len(cells) == 126
    assert all(0 <= c <= 3 for c in cells)


async def test_needs_review_orders_by_lapses(client, seeded):
    await client.post("/review/grade", json={"card_id": seeded[1], "rating": "forgot", "mode": "quiz", "is_correct": False})
    r = await client.get("/progress/needs-review")
    assert r.status_code == 200
    items = r.json()
    assert items[0]["lapses"] >= 1


async def test_word_of_day_and_recent(client, seeded):
    assert (await client.get("/dashboard/word-of-day")).status_code == 200
    recent = (await client.get("/cards/recent")).json()
    assert len(recent) == 3
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run pytest tests/api/test_progress.py -v`
Expected: FAIL — routes missing.

- [ ] **Step 3: Write schemas**

`backend/app/schemas/progress.py`:
```python
import uuid

from pydantic import BaseModel


class MasteryCounts(BaseModel):
    new: int
    learning: int
    proficient: int


class WeeklyBar(BaseModel):
    label: str
    count: int


class ProgressSummaryOut(BaseModel):
    streak: int
    reviews_today: int
    mastery: MasteryCounts
    weekly_bars: list[WeeklyBar]
    due_total: int


class HeatmapOut(BaseModel):
    cells: list[int]


class NeedsReviewItem(BaseModel):
    card_id: uuid.UUID
    word: str
    lapses: int


class WordOfDayOut(BaseModel):
    card_id: uuid.UUID
    word: str
    phonetic: str
    pos: str
    meaning: str
    example: str
```

- [ ] **Step 4: Write the service**

`backend/app/services/progress.py`:
```python
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import desc, select

from app.config import get_settings
from app.db.models import Card, ReviewLog
from app.schemas.card import CardOut
from app.schemas.progress import (
    HeatmapOut,
    MasteryCounts,
    NeedsReviewItem,
    ProgressSummaryOut,
    WeeklyBar,
    WordOfDayOut,
)
from app.services.srs import mastery

_WEEKDAY_LABELS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]  # Mon..Sun (FE labels)
_HEATMAP_DAYS = 126


def _tz() -> ZoneInfo:
    return ZoneInfo(get_settings().app_timezone)


async def _review_local_dates(session, since_utc: datetime) -> list:
    rows = (
        await session.execute(
            select(ReviewLog.reviewed_at).where(ReviewLog.reviewed_at >= since_utc)
        )
    ).scalars().all()
    tz = _tz()
    return [dt.astimezone(tz).date() for dt in rows]


async def summary(session) -> ProgressSummaryOut:
    tz = _tz()
    now_local = datetime.now(tz)
    today = now_local.date()

    cards = list((await session.execute(select(Card))).scalars().all())
    counts = {"new": 0, "learning": 0, "proficient": 0}
    for c in cards:
        counts[mastery(c.repetitions, c.interval_days)] += 1
    now_utc = now_local.astimezone(ZoneInfo("UTC"))
    due_total = sum(1 for c in cards if c.due_at <= now_utc)

    dates = await _review_local_dates(session, now_utc - timedelta(days=_HEATMAP_DAYS))
    per_day: dict = {}
    for d in dates:
        per_day[d] = per_day.get(d, 0) + 1

    reviews_today = per_day.get(today, 0)

    # streak: consecutive days up to today with >= 1 review
    streak = 0
    cursor = today
    while per_day.get(cursor, 0) > 0:
        streak += 1
        cursor = cursor - timedelta(days=1)

    # weekly bars: this week's Monday..Sunday
    monday = today - timedelta(days=today.weekday())
    weekly_bars = [
        WeeklyBar(label=_WEEKDAY_LABELS[i], count=per_day.get(monday + timedelta(days=i), 0))
        for i in range(7)
    ]

    return ProgressSummaryOut(
        streak=streak,
        reviews_today=reviews_today,
        mastery=MasteryCounts(**counts),
        weekly_bars=weekly_bars,
        due_total=due_total,
    )


async def heatmap(session) -> HeatmapOut:
    tz = _tz()
    today = datetime.now(tz).date()
    start = today - timedelta(days=_HEATMAP_DAYS - 1)
    dates = await _review_local_dates(session, datetime.now(ZoneInfo("UTC")) - timedelta(days=_HEATMAP_DAYS))
    per_day: dict = {}
    for d in dates:
        per_day[d] = per_day.get(d, 0) + 1

    def bucket(n: int) -> int:
        if n == 0:
            return 0
        if n < 3:
            return 1
        if n < 6:
            return 2
        return 3

    cells = [bucket(per_day.get(start + timedelta(days=i), 0)) for i in range(_HEATMAP_DAYS)]
    return HeatmapOut(cells=cells)


async def needs_review(session, limit: int = 10) -> list[NeedsReviewItem]:
    rows = (
        await session.execute(
            select(Card).where(Card.lapses > 0).order_by(desc(Card.lapses)).limit(limit)
        )
    ).scalars().all()
    return [NeedsReviewItem(card_id=c.id, word=c.word, lapses=c.lapses) for c in rows]


async def word_of_day(session) -> WordOfDayOut | None:
    cards = list((await session.execute(select(Card).order_by(Card.created_at))).scalars().all())
    if not cards:
        return None
    ordinal = datetime.now(_tz()).date().toordinal()
    c = cards[ordinal % len(cards)]
    return WordOfDayOut(
        card_id=c.id, word=c.word, phonetic=c.phonetic, pos=c.pos, meaning=c.meaning, example=c.example
    )


async def recent_cards(session, limit: int = 3) -> list[CardOut]:
    rows = (
        await session.execute(select(Card).order_by(desc(Card.created_at)).limit(limit))
    ).scalars().all()
    return [CardOut.model_validate(c) for c in rows]
```

- [ ] **Step 5: Write the router and mount it**

`backend/app/api/routers/progress.py`:
```python
from fastapi import APIRouter, HTTPException, Query

from app.api.deps import SessionDep
from app.schemas.card import CardOut
from app.schemas.progress import HeatmapOut, NeedsReviewItem, ProgressSummaryOut, WordOfDayOut
from app.services import progress as svc

progress_router = APIRouter(prefix="/progress", tags=["progress"])
dashboard_router = APIRouter(prefix="/dashboard", tags=["dashboard"])
cards_extra_router = APIRouter(prefix="/cards", tags=["cards"])


@progress_router.get("/summary", response_model=ProgressSummaryOut)
async def summary(session: SessionDep):
    return await svc.summary(session)


@progress_router.get("/heatmap", response_model=HeatmapOut)
async def heatmap(session: SessionDep):
    return await svc.heatmap(session)


@progress_router.get("/needs-review", response_model=list[NeedsReviewItem])
async def needs_review(session: SessionDep, limit: int = Query(default=10, ge=1, le=50)):
    return await svc.needs_review(session, limit)


@dashboard_router.get("/word-of-day", response_model=WordOfDayOut)
async def word_of_day(session: SessionDep):
    result = await svc.word_of_day(session)
    if result is None:
        raise HTTPException(status_code=404, detail="No cards yet")
    return result


@cards_extra_router.get("/recent", response_model=list[CardOut])
async def recent(session: SessionDep, limit: int = Query(default=3, ge=1, le=20)):
    return await svc.recent_cards(session, limit)
```

Modify `backend/app/api/router.py`:
```python
from app.api.routers import cards, decks, health, progress, review

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(decks.router)
api_router.include_router(cards.deck_cards_router)
# /cards/recent must be registered before /cards/{card_id} to avoid 'recent' parsing as a UUID
api_router.include_router(progress.cards_extra_router)
api_router.include_router(cards.cards_router)
api_router.include_router(review.router)
api_router.include_router(progress.progress_router)
api_router.include_router(progress.dashboard_router)
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && uv run pytest tests/api/test_progress.py -v`
Expected: PASS (4 passed).

- [ ] **Step 7: Commit**

```bash
git add backend/app/schemas/progress.py backend/app/services/progress.py backend/app/api/routers/progress.py backend/app/api/router.py backend/tests/api/test_progress.py
git commit -m "feat(backend): progress, heatmap, needs-review, word-of-day, recent endpoints"
```

---

## Task 10: Reset progress (`POST /progress/reset`)

Deletes all `review_logs` and resets every card's SM-2 state to defaults. Keeps decks/cards.

**Files:**
- Modify: `backend/app/services/progress.py` (add `reset_progress`)
- Modify: `backend/app/api/routers/progress.py` (add route)
- Test: `backend/tests/api/test_reset.py`

**Interfaces:**
- Consumes: `SessionDep`, `Card`, `ReviewLog`.
- Produces: `services.progress.reset_progress(session) -> dict` returning `{"reset": <cards_reset_count>}`. Route `POST /progress/reset` → `200`.

- [ ] **Step 1: Write the failing test**

`backend/tests/api/test_reset.py`:
```python
import pytest_asyncio


@pytest_asyncio.fixture
async def graded(client):
    did = (await client.post("/decks", json={"name": "D", "topic": "t"})).json()["id"]
    cid = (await client.post(f"/decks/{did}/cards",
           json={"word": "resilient", "meaning": "kiên cường"})).json()["id"]
    await client.post("/review/grade", json={"card_id": cid, "rating": "remember", "mode": "flash"})
    return cid


async def test_reset_clears_history_and_schedule_but_keeps_cards(client, graded):
    r = await client.post("/progress/reset")
    assert r.status_code == 200

    # card still exists, schedule back to defaults, due again
    card = (await client.get(f"/cards/{graded}")).json()
    assert card["repetitions"] == 0
    assert card["interval_days"] == 0
    assert card["lapses"] == 0
    assert card["ease_factor"] == 2.5
    assert card["last_reviewed_at"] is None

    summary = (await client.get("/progress/summary")).json()
    assert summary["reviews_today"] == 0
    assert summary["due_total"] == 1
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run pytest tests/api/test_reset.py -v`
Expected: FAIL — route missing.

- [ ] **Step 3: Add the service function**

Append to `backend/app/services/progress.py`:
```python
from datetime import datetime, timezone

from sqlalchemy import delete, update


async def reset_progress(session) -> dict:
    await session.execute(delete(ReviewLog))
    await session.execute(
        update(Card).values(
            ease_factor=2.5,
            interval_days=0,
            repetitions=0,
            lapses=0,
            last_reviewed_at=None,
            due_at=datetime.now(timezone.utc),
        )
    )
    count = (await session.execute(select(Card))).scalars().all()
    await session.commit()
    return {"reset": len(count)}
```
(`datetime`/`timezone` may already be imported at the top; keep a single import.)

- [ ] **Step 4: Add the route**

Modify `backend/app/api/routers/progress.py` — add route to `progress_router`:
```python
@progress_router.post("/reset")
async def reset(session: SessionDep):
    return await svc.reset_progress(session)
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && uv run pytest tests/api/test_reset.py -v`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/progress.py backend/app/api/routers/progress.py backend/tests/api/test_reset.py
git commit -m "feat(backend): reset-progress endpoint"
```

---

## Task 11: Seed script + startup wiring + README + full verification

**Files:**
- Create: `backend/app/seed.py`
- Modify: `backend/app/main.py` (optional seed-on-startup via lifespan)
- Modify (replace): `backend/README.md`
- Test: `backend/tests/api/test_seed.py`

**Interfaces:**
- Consumes: `SessionLocal`, `Deck`, `Card`.
- Produces: `app.seed.SEED_DECK_NAME = "Bộ thẻ khởi động"`, `app.seed.SEED_CARDS` (list of dicts), `app.seed.split_phon(phon: str) -> tuple[str, str]`, `app.seed.seed(session) -> bool` (True if seeded, False if already present), `app.seed.main()` (CLI entry).

- [ ] **Step 1: Write the failing test**

`backend/tests/api/test_seed.py`:
```python
from app.seed import SEED_DECK_NAME, seed, split_phon


def test_split_phon_separates_phonetic_and_pos():
    assert split_phon("/rɪˈzɪl.i.ənt/ · adjective") == ("/rɪˈzɪl.i.ənt/", "adjective")
    assert split_phon("phrasal verb") == ("", "phrasal verb")


async def test_seed_is_idempotent_and_creates_starter_deck(session):
    assert await seed(session) is True
    assert await seed(session) is False  # second run skips

    from sqlalchemy import select

    from app.db.models import Card, Deck

    decks = (await session.execute(select(Deck).where(Deck.name == SEED_DECK_NAME))).scalars().all()
    assert len(decks) == 1
    cards = (await session.execute(select(Card))).scalars().all()
    assert len(cards) == 5
    assert any(c.word == "resilient" for c in cards)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && uv run pytest tests/api/test_seed.py -v`
Expected: FAIL — `ModuleNotFoundError: app.seed`.

- [ ] **Step 3: Write the seed module**

`backend/app/seed.py`:
```python
import asyncio

from sqlalchemy import select

from app.db.models import Card, Deck
from app.db.session import SessionLocal

SEED_DECK_NAME = "Bộ thẻ khởi động"
SEED_DECK_TOPIC = "từ vựng"

# Ported from frontend src/data/seed.ts SESSION (word, phon, meaning, example).
SEED_CARDS = [
    {"word": "resilient", "phon": "/rɪˈzɪl.i.ənt/ · adjective",
     "meaning": "có khả năng phục hồi nhanh; kiên cường",
     "example": "She is so resilient — she bounced back within a week."},
    {"word": "serendipity", "phon": "/ˌser.ənˈdɪp.ə.ti/ · noun",
     "meaning": "sự tình cờ may mắn; duyên may bất ngờ",
     "example": "Finding that little café was pure serendipity."},
    {"word": "meticulous", "phon": "/məˈtɪk.jə.ləs/ · adjective",
     "meaning": "tỉ mỉ, kỹ lưỡng, cẩn thận",
     "example": "He kept meticulous records of every transaction."},
    {"word": "ambiguous", "phon": "/æmˈbɪɡ.ju.əs/ · adjective",
     "meaning": "mơ hồ, nước đôi, đa nghĩa",
     "example": "The instructions were ambiguous and confusing."},
    {"word": "to put off", "phon": "phrasal verb",
     "meaning": "trì hoãn, hoãn lại",
     "example": "Don't put off until tomorrow what you can do today."},
]


def split_phon(phon: str) -> tuple[str, str]:
    if " · " in phon:
        phonetic, pos = phon.split(" · ", 1)
        return phonetic.strip(), pos.strip()
    return "", phon.strip()


async def seed(session) -> bool:
    existing = (
        await session.execute(select(Deck).where(Deck.name == SEED_DECK_NAME))
    ).scalars().first()
    if existing is not None:
        return False
    deck = Deck(name=SEED_DECK_NAME, topic=SEED_DECK_TOPIC)
    for item in SEED_CARDS:
        phonetic, pos = split_phon(item["phon"])
        deck.cards.append(
            Card(
                word=item["word"],
                phonetic=phonetic,
                pos=pos,
                meaning=item["meaning"],
                example=item["example"],
            )
        )
    session.add(deck)
    await session.commit()
    return True


async def _run() -> None:
    async with SessionLocal() as session:
        created = await seed(session)
        print("Seeded starter deck." if created else "Starter deck already exists; skipped.")


def main() -> None:
    asyncio.run(_run())


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && uv run pytest tests/api/test_seed.py -v`
Expected: PASS (2 passed).

- [ ] **Step 5: Wire optional seed-on-startup**

Modify `backend/app/main.py` to add a lifespan that seeds when `SEED_ON_STARTUP` is true:
```python
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.config import get_settings
from app.db.session import SessionLocal


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    if settings.seed_on_startup:
        from app.seed import seed

        async with SessionLocal() as session:
            await seed(session)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Snoopify Backend", version="0.1.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(api_router)
    return app


app = create_app()
```

- [ ] **Step 6: Replace `backend/README.md`**

`backend/README.md`:
````markdown
# Snoopify Backend

FastAPI + PostgreSQL backend for Snoopify (single-user, no auth). SM-2
spaced-repetition scheduling. See the design spec at
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
````

- [ ] **Step 7: Full verification**

Run from `backend/`:
```bash
uv run ruff check .
uv run pytest -v
```
Expected: ruff clean (fix any reported issues); **all tests pass**.

Then smoke-test the running app:
```bash
docker compose up -d db
uv run alembic upgrade head
uv run python -m app.seed
uv run uvicorn app.main:app &
curl -s localhost:8000/health
curl -s localhost:8000/review/session | head -c 400
```
Expected: `{"status":"ok"}`; the session returns 5 review items with `quiz`/`fill`. Open `http://localhost:8000/docs` and confirm all endpoints render.

- [ ] **Step 8: Commit**

```bash
git add backend/app/seed.py backend/app/main.py backend/README.md backend/tests/api/test_seed.py
git commit -m "feat(backend): seed script, startup seeding, README, verification"
```

---

## Self-Review

**1. Spec coverage** (spec → task):
- §3 stack → Task 1 (deps), Task 3 (db). §4 structure → all tasks follow the layout.
- §5 data model: `decks`/`cards`/`review_logs` → Task 3; derived stats → Task 9; SM-2 fields on cards → Task 3; upgrade path → documented, not built (correct, out of v1 scope).
- §6 API: health (T1), decks CRUD (T4), import (T6), cards CRUD (T5), review session (T7), grade (T8), reset (T10), progress summary/heatmap/needs-review (T9), word-of-day/recent (T9). All rows covered.
- §7 SM-2 (2/3/5, ease clamp, interval 0→1→6→×EF) → Task 2. §8 quiz/fill generation incl. fallbacks → Task 7.
- §9 stats with `APP_TIMEZONE` → Task 9. §10 seed + migrations → Task 11 + Task 3. §11 config/docker/Supabase → Task 1/3 + README. §12 error handling (404/400/422, fallbacks) → Tasks 4–10. §13 testing → every task is TDD; coverage across unit+api. §14 out-of-scope respected (no auth, no FE wiring, no factory wipe/undo/bulk).

**2. Placeholder scan:** no "TBD/TODO"; every code step contains complete code; every test step contains real assertions. None found.

**3. Type consistency:** `get_session`/`SessionDep` consistent (T3→all). `Schedule`/`review`/`mastery` signatures match between T2 definition and T8/T9 use. `_to_out` (T4) reused by T6. `_get_or_404` (T4) reused by T5. `build_quiz`/`build_fill` signatures match T7 def and use. `GradeRequest`/`GradeResult` consistent T8. `CardOut.model_validate` used in T4/T9 consistently. Router include order notes (`/cards/recent` before `/cards/{card_id}`; `/decks/import` before `/decks/{deck_id}`) are called out to prevent path-param shadowing.

No issues requiring fixes.
