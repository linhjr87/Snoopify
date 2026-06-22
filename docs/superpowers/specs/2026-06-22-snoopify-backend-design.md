# Snoopify — Backend Design

**Date:** 2026-06-22
**Status:** Approved (design)
**Depends on:** `2026-06-22-myenglish-dashboard-conversion-design.md` (frontend spec)
**Language note:** written in English to match the sibling frontend spec; Vietnamese
appears only inside content data (card meanings, deck names).

## 1. Goal

Build the backend for **Snoopify** — the Vietnamese-language English-learning
flashcard app whose frontend already exists (`frontend/`, React + Zustand +
`localStorage`). The backend replaces browser-only storage with a real API +
database, and adds the value the frontend explicitly deferred: a **real
spaced-repetition engine** (SM-2) that schedules reviews and computes which cards
are due.

This is a **backend-only** spec. Wiring the frontend to the API (replacing the
Zustand store / `data/seed.ts` seams) is a separate, later spec.

## 2. Decisions (constraints)

| Aspect | Decision |
|---|---|
| User scope | **Single user, no authentication** (auth deferred; upgrade path documented) |
| Spaced repetition | **SM-2 adapted to 3 grades**, computes due cards |
| Database | **PostgreSQL** — Docker for dev → **Supabase** (managed Postgres) for prod |
| Spec scope | **Backend only**; frontend integration is a later spec |
| Seed data | Seed **one starter deck** with the 5 real review cards from the FE |
| Stack | **Python + FastAPI** (async) |
| Architecture | **Layered (horizontal):** routers → services → db, with SR isolated in a pure module |

## 3. Tech stack

- **Python 3.12**, **FastAPI** (async) + **Uvicorn**.
- **SQLAlchemy 2.0 (async)** + **asyncpg** driver; **Alembic** for migrations.
- **Pydantic v2** for request/response schemas; **pydantic-settings** for config.
- **PostgreSQL 16** via Docker (dev); Supabase (prod) by swapping `DATABASE_URL`.
- Dependency management with **`uv`** (`pyproject.toml`); **ruff** for lint/format.
- Tests: **pytest** + **pytest-asyncio** + **httpx.AsyncClient**, against a
  dedicated test Postgres.
- **docker-compose**: `db` (postgres) + `api` (FastAPI, hot-reload).

## 4. Project structure

Layered horizontal split. The SR engine lives in a pure, DB-free module so it can
be unit-tested branch by branch.

```
backend/
  pyproject.toml  README.md  .env.example
  docker-compose.yml  Dockerfile  alembic.ini
  migrations/                      # alembic env + versions
  app/
    main.py                        # app factory, include routers, lifespan
    config.py                      # Settings: DATABASE_URL, CORS, APP_TIMEZONE, ...
    db/
      base.py                      # DeclarativeBase
      session.py                   # async engine + sessionmaker + get_session dep
      models.py                    # ORM: Deck, Card, ReviewLog
    schemas/                       # Pydantic: deck / card / review / progress
    services/
      decks.py  cards.py           # CRUD + logic
      review.py                    # session assembly, quiz/fill generation
      srs.py                       # SM-2 pure functions (no DB) <- unit-tested
      progress.py                  # streak / heatmap / mastery aggregation
      importer.py                  # JSON import (ports parseAndImport semantics)
    api/
      deps.py                      # shared dependencies (db session)
      routers/                     # decks cards review progress health
    seed.py                        # seed starter deck (5 cards)
  tests/  unit/  api/  conftest.py
```

**Conventions:** routers only receive/validate requests and call services; all
business logic (SR, statistics, import) lives in `services/`; ORM models are kept
separate from Pydantic schemas so the data crossing the boundary is controlled.
CORS is enabled for the FE dev origin (`http://localhost:5173`).

## 5. Data model

Single-user, so there is **no `users` table** yet. Only **three tables**; every
statistic (streak, heatmap, mastery, needs-review) is **derived** from them — no
denormalized aggregates, no drift.

### `decks`

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | server-generated; Supabase- and sync-friendly |
| name | text | |
| topic | text | maps to FE `topic` |
| created_at / updated_at | timestamptz | |

`count` (number of cards) is **not stored** — computed from the relationship.

### `cards` — embeds the SM-2 schedule (one card = one schedule, single-user)

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| deck_id | UUID (FK → decks, ON DELETE CASCADE) | |
| word, phonetic, pos, meaning, example | text | the exact 5 fields of FE `Card` |
| ease_factor | float (default 2.5) | SM-2 |
| interval_days | int (default 0) | SM-2 |
| repetitions | int (default 0) | SM-2 |
| lapses | int (default 0) | count of "forgot" → feeds needs-review |
| due_at | timestamptz (default now) | due when `due_at <= now` |
| last_reviewed_at | timestamptz, null | |
| created_at / updated_at | timestamptz | |

Cards do **not** store quiz/fill data — those are generated at session-assembly
time (§8), so every card (including imported ones) is reviewable in all 3 modes.

### `review_logs` — one row per grade

| Column | Type | Notes |
|---|---|---|
| id | UUID (PK) | |
| card_id | UUID (FK → cards, ON DELETE CASCADE) | |
| rating | enum `forgot` / `vague` / `remember` | the 3 FE buttons |
| mode | enum `flash` / `quiz` / `fill` | |
| is_correct | bool, null | for quiz/fill; null for flashcard |
| reviewed_at | timestamptz | |

### Derived statistics

- **Mastery** (Mới / Đang học / Thành thạo): pure function of `repetitions` and
  `interval_days` — `reps = 0` → New; `0 < interval_days < 21` → Learning;
  `interval_days >= 21` → Proficient.
- **Streak / heatmap / weekly bars:** group `review_logs` by day.
- **Needs-review:** cards ordered by `lapses` descending.
- **Recently added:** cards ordered by `created_at` descending.
  **Word-of-day:** one card chosen deterministically by date.

### Upgrade path to auth (future, not in v1)

Add a `users` table + `user_id` column on `decks`; move the SM-2 schedule fields
off `cards` into a `card_progress(user_id, card_id, …)` table. Straight migration,
no rework of v1 logic.

## 6. API surface

REST, no auth in v1.

| Method & path | Purpose |
|---|---|
| `GET /health` | liveness |
| `GET /decks` | list decks + computed `count` + due-card count |
| `POST /decks` | create deck `{name, topic}` |
| `GET /decks/{id}` | deck detail + cards |
| `PATCH /decks/{id}` | update name/topic |
| `DELETE /decks/{id}` | delete deck (cascade cards) |
| `POST /decks/import` | import JSON — ports `parseAndImport` (validate `deck`/`cards[].word`, filter cards missing `word`, return deck + status message) |
| `GET /decks/{id}/cards` | list cards in deck |
| `POST /decks/{id}/cards` | add card `{word, phonetic, pos, meaning, example}` |
| `GET /cards/{id}` | card detail (incl. SR state) |
| `PATCH /cards/{id}` | edit card fields |
| `DELETE /cards/{id}` | delete card |
| `GET /review/session?deck_id=&limit=20` | assemble session: due cards (`due_at <= now`), each with generated quiz + fill |
| `POST /review/grade` | `{card_id, rating, mode, is_correct?}` → run SM-2, write `review_log`, return updated schedule (`due_at`, `interval_days`, …) |
| `POST /progress/reset` | reset progress: delete all `review_logs` + reset every card's SM-2 state to defaults (`ease 2.5, interval 0, reps 0, lapses 0, due_at = now, last_reviewed = null`). **Keeps** decks/cards. Mirrors FE `resetProgress`; the confirm step is FE-side. |
| `GET /progress/summary` | streak, reviews today, mastery counts {New/Learning/Proficient}, weekly bars (7 days), total due |
| `GET /progress/heatmap` | 126 cells (0..3) from 18 weeks of `review_logs` |
| `GET /progress/needs-review` | top cards by `lapses` |
| `GET /dashboard/word-of-day` | deterministic card of the day |
| `GET /cards/recent` | recently added cards |

**Delete/reset set (v1):** `POST /progress/reset` + `DELETE /decks/{id}` +
`DELETE /cards/{id}`. No factory wipe, undo-last-grade, or bulk delete in v1.

## 7. Spaced repetition engine — SM-2 adapted to 3 grades

Implemented as pure functions in `services/srs.py` (no DB, no HTTP). Input:
`(ease_factor, interval_days, repetitions, lapses, rating)` → new schedule state.

Grade → SM-2 quality mapping: **forgot = 2** (lapse), **vague = 3**,
**remember = 5**.

- **forgot (q < 3):** `repetitions = 0`, `interval_days = 1` (re-show soon),
  `lapses += 1`.
- **vague / remember (q >= 3):**
  - `repetitions == 0` → `interval_days = 1`
  - `repetitions == 1` → `interval_days = 6`
  - `repetitions >= 2` → `interval_days = round(interval_days * ease_factor)`
  - then `repetitions += 1`
- **Ease update (all grades):**
  `EF += 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)`, clamped to `>= 1.3`.
- `due_at = now + interval_days` days.

New/seeded cards start at `due_at = now`, so they are due immediately.

## 8. Review session assembly — dynamic quiz/fill generation

Cards store only the 5 content fields; quiz and fill are generated when the
session is assembled (`services/review.py`), so any card is reviewable in all 3
modes.

- **Quiz:** correct answer = the card's `meaning`; 3 distractors = random
  `meaning`s from other cards (prefer the same deck for plausibility),
  de-duplicated and distinct from the correct answer; shuffle and assign keys
  A–D. Response: `{ options: [{key, text}], correct_key }`.
  *Edge:* if fewer than 4 distinct meanings are available, return fewer options
  (the 5-card seed always has enough).
- **Fill:** split the card's `example` around `word` →
  `{ before, after, answer: word, hint }`, where `hint` is the first letter plus
  underscores (e.g. `r________`).
  *Fallback:* if `word` is not found verbatim in `example` (e.g. the phrasal
  "to put off"), try case-insensitive / "to"-stripped matching; if still not
  found, show `meaning` as the prompt and ask the user to type `word`.

A review item in the response carries the card fields + `quiz` + `fill`, shaped
like the FE `SESSION` item, so the later FE integration is nearly 1:1.

## 9. Progress & statistics

All computed from the 3 tables, day boundaries resolved in `APP_TIMEZONE`:

- **`/progress/summary`:** `streak` (consecutive days up to today with >= 1
  review), `reviews_today`, `mastery` counts (New/Learning/Proficient via §5
  thresholds), `weekly_bars` (review counts for the last 7 days), `due_total`
  (cards with `due_at <= now`).
- **`/progress/heatmap`:** 126 cells (18 weeks × 7 days); each cell's intensity
  0..3 is bucketed from that day's review count.
- **`/progress/needs-review`:** cards with the highest `lapses`.
- **`/dashboard/word-of-day`:** one card selected deterministically from the
  current date (stable within a day).
- **`/cards/recent`:** cards by `created_at` descending.

## 10. Seed data & migrations

- **Alembic** creates the schema (3 tables + enums). Run `alembic upgrade head`
  locally and against Supabase.
- **Seed script** (`app/seed.py`; run via `python -m app.seed`, or automatically
  when the DB is empty if `SEED_ON_STARTUP=true`): creates one starter deck
  (`name: "Bộ thẻ khởi động", topic: "từ vựng"`) with the 5 real cards from the FE
  `SESSION` (resilient, serendipity, meticulous, ambiguous, to put off). The FE
  `phon` field (e.g. `"/rɪˈzɪl.i.ənt/ · adjective"`) is split on `" · "` into
  `phonetic` + `pos`; entries without `" · "` (e.g. `"phrasal verb"`) yield an
  empty `phonetic` and `pos = "phrasal verb"`. `due_at = now`. The script is
  **idempotent** (skips if the starter deck already exists).
- The FE's display-only "showcase" decks (Business English, Idioms & Phrasal,
  etc.) had no real card data, so they are **not** reproduced.

## 11. Configuration & deployment (Docker → Supabase)

- **`pydantic-settings`** reads `.env`: `DATABASE_URL`, `CORS_ORIGINS`, `APP_ENV`,
  `APP_TIMEZONE` (default `Asia/Ho_Chi_Minh`), `SEED_ON_STARTUP`.
- **docker-compose:** `db` (postgres:16 + named volume + healthcheck) and `api`
  (built from Dockerfile; `depends_on` db healthy; code mounted for reload;
  entrypoint runs `alembic upgrade head` then `uvicorn`).
- **Supabase transition:** point `DATABASE_URL` at the Supabase connection string
  with SSL enabled, then run `alembic upgrade head`.
  *Gotcha (documented in `.env.example` + README):* through Supabase's pgbouncer
  pooler, asyncpg must set `statement_cache_size=0` to avoid prepared-statement
  errors.

## 12. Error handling & edge cases

- Pydantic validation → automatic **422**; consistent error body. Missing
  deck/card → **404**.
- **Import:** invalid JSON or missing `deck`/`cards[].word` → **400** with the FE
  message semantics (`JSON không hợp lệ hoặc thiếu trường bắt buộc (deck,
  cards[].word)`); cards without `word` are filtered; an empty result is an error.
- **Quiz** with < 4 cards → fewer options (no crash). **Fill** with no `word`
  match in `example` → `meaning` fallback.
- **Grade** on a nonexistent card → 404; ease clamped `>= 1.3`. Empty session
  (no due cards) → `[]` with 200.
- **Timezone:** all timestamps stored as UTC `timestamptz`; "today" / streak /
  heatmap day boundaries computed in `APP_TIMEZONE` so they match the user's local
  day.
- DB session is per-request; on error the transaction is rolled back and a 500 is
  returned (and logged).

## 13. Testing & verification

**Tooling:** pytest + pytest-asyncio + httpx.AsyncClient; a dedicated test
Postgres (docker / testcontainers).

- **Unit:** `srs.py` (each branch — forgot resets + lapse; vague/remember interval
  progression 0→1→6→×EF; ease clamp); `importer.py`
  (valid/invalid/missing-field/filtered/empty — mirroring the FE `parseAndImport`
  tests); quiz/fill generation (distractor count + dedup, fill split, fallback);
  progress aggregation (mastery buckets, streak from logs, heatmap bucketing).
- **API / integration:** create deck → add cards → get session → grade →
  `due_at` advances → progress summary reflects the change; `POST /progress/reset`
  wipes logs and resets schedules.
- **Coverage:** ~80%+ on `services/`.

**Done =** `docker compose up` boots `api` + `db`; `alembic upgrade head` runs
clean; seed loads the 5 cards; `pytest` is green; OpenAPI docs at `/docs` render
all endpoints.

## 14. Out of scope (v1)

- Authentication / multi-user (upgrade path documented in §5).
- Wiring the frontend to the API (separate later spec).
- SR features beyond SM-2 (fuzz, learning steps, custom intervals).
- Audio/TTS, images, deck sharing, analytics beyond what the FE shows.
- Realtime / websockets.
- Factory wipe, undo-last-grade, and bulk-delete endpoints.
