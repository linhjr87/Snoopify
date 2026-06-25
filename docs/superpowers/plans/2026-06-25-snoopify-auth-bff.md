# Real Auth (Redis sessions) + Per-User Data — Implementation Plan (SP-B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fake client-only auth with real email/password auth (Redis-backed server sessions, opaque `sid` httpOnly cookie) and scope every deck/card/review/progress read and write to the authenticated user.

**Architecture:** Backend is the auth authority: bcrypt password hashing, sessions in Redis, a `get_current_user` dependency that reads the `sid` cookie. A `user_id` FK on `decks` scopes all data (cards/reviews cascade from decks). Frontend is a thin BFF: auth forms POST to `/api/auth/*` (existing Next rewrite → backend, which sets the cookie); a Next `middleware.ts` does a presence-only redirect; server `apiFetch` forwards the cookie.

**Tech Stack:** FastAPI, SQLAlchemy async, Postgres, Alembic, **Redis** (`redis.asyncio`), **bcrypt**, pytest + httpx + **fakeredis**; Next 15 App Router, TypeScript.

## Global Constraints

- **Session:** opaque `sid = secrets.token_urlsafe(32)`; Redis `session:{sid}` → the user's UUID string, `EX settings.session_ttl_seconds`. Cookie `sid`: `httponly=True`, `samesite="lax"`, `secure=settings.cookie_secure`, `path="/"`, `max_age=settings.session_ttl_seconds`.
- **Password hashing:** use the **`bcrypt`** package directly (NOT passlib — avoids the passlib/bcrypt≥4.1 `__about__` warning). `hash_password`/`verify_password` in `app/services/auth.py`.
- **Data scoping:** `decks.user_id` is `NOT NULL` FK → `users.id` `ondelete CASCADE`, indexed. Every `select(Deck)` filters `Deck.user_id == user.id`; every `select(Card)`/`select(ReviewLog)` joins to `decks` and filters `decks.user_id == user.id`. Ownership miss → **404** (never 403 — do not reveal existence).
- **Auth dependency:** `CurrentUserDep = Annotated[User, Depends(get_current_user)]`; missing/expired session → **401**.
- **Existing dev data:** the Alembic migration deletes existing `decks` (cascade) before adding `user_id NOT NULL`. The global `seed_on_startup` path is disabled; each new user is seeded a starter deck on register.
- **Test DB** builds schema via `Base.metadata.create_all` (conftest), NOT Alembic — so model changes appear in tests automatically; the migration is only exercised against the real DB.
- **Redis in tests:** override the `get_redis` dependency with `fakeredis.aioredis.FakeRedis(decode_responses=True)`.
- **Frontend:** auth forms POST `/api/auth/*`; client `fetch` is same-origin so the cookie rides automatically; server `apiFetch` forwards the cookie manually. UI copy stays Vietnamese. No new npm deps.
- Backend dir: `D:\CHRIS\RESEARCH\LEARN-EN\backend`; run tests `python -m pytest`. Frontend dir: `frontend`; tests `npx vitest run`. Commit per task.

---

## Phase 1 — Backend auth core

### Task 1: Config, Redis session store, password hashing

**Files:**
- Modify: `backend/pyproject.toml` (deps), `backend/app/config.py`
- Create: `backend/app/redis.py`, `backend/app/services/auth.py`
- Create: `backend/tests/unit/test_auth_service.py`, `backend/tests/unit/test_session_store.py`

**Interfaces:**
- Produces: `get_redis() -> redis.asyncio.Redis` + `RedisDep`; `create_session(redis, user_id: uuid.UUID) -> str`, `get_session_user_id(redis, sid: str) -> uuid.UUID | None`, `delete_session(redis, sid: str) -> None` (in `app/redis.py`); `hash_password(pw: str) -> str`, `verify_password(pw: str, hashed: str) -> bool` (in `app/services/auth.py`).

- [ ] **Step 1: Add dependencies** — `backend/pyproject.toml`

Add to `[project].dependencies`: `"redis>=5.0"`, `"bcrypt>=4.1"`. Add to `[dependency-groups].dev`: `"fakeredis>=2.26"`. Then install: `cd backend && pip install -e ".[dev]"` (or `uv sync` if the repo uses uv — check for `uv.lock`).

- [ ] **Step 2: Extend config** — `backend/app/config.py`, add fields to `Settings`:

```python
    redis_url: str = "redis://localhost:6379/0"
    session_ttl_seconds: int = 60 * 60 * 24 * 7  # 7 days
    cookie_secure: bool = False
```

- [ ] **Step 3: Write failing tests** — `backend/tests/unit/test_auth_service.py`

```python
from app.services.auth import hash_password, verify_password

def test_hash_is_not_plaintext_and_verifies():
    h = hash_password("s3cret!")
    assert h != "s3cret!"
    assert verify_password("s3cret!", h) is True

def test_verify_rejects_wrong_password():
    h = hash_password("s3cret!")
    assert verify_password("nope", h) is False
```

`backend/tests/unit/test_session_store.py`:

```python
import uuid
import pytest
from fakeredis.aioredis import FakeRedis
from app.redis import create_session, get_session_user_id, delete_session

@pytest.mark.asyncio
async def test_session_roundtrip_and_delete():
    r = FakeRedis(decode_responses=True)
    uid = uuid.uuid4()
    sid = await create_session(r, uid)
    assert isinstance(sid, str) and len(sid) > 20
    assert await get_session_user_id(r, sid) == uid
    await delete_session(r, sid)
    assert await get_session_user_id(r, sid) is None

@pytest.mark.asyncio
async def test_unknown_sid_returns_none():
    r = FakeRedis(decode_responses=True)
    assert await get_session_user_id(r, "missing") is None
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `cd backend && python -m pytest tests/unit/test_auth_service.py tests/unit/test_session_store.py -q`
Expected: FAIL (modules `app.redis` / `app.services.auth` not found).

- [ ] **Step 5: Implement `app/services/auth.py`**

```python
import bcrypt


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False
```

- [ ] **Step 6: Implement `app/redis.py`**

```python
import secrets
import uuid

import redis.asyncio as aioredis

from app.config import get_settings

_settings = get_settings()
_client: aioredis.Redis = aioredis.from_url(_settings.redis_url, decode_responses=True)


async def get_redis() -> aioredis.Redis:
    return _client


def _key(sid: str) -> str:
    return f"session:{sid}"


async def create_session(redis: aioredis.Redis, user_id: uuid.UUID) -> str:
    sid = secrets.token_urlsafe(32)
    await redis.set(_key(sid), str(user_id), ex=get_settings().session_ttl_seconds)
    return sid


async def get_session_user_id(redis: aioredis.Redis, sid: str) -> uuid.UUID | None:
    raw = await redis.get(_key(sid))
    return uuid.UUID(raw) if raw else None


async def delete_session(redis: aioredis.Redis, sid: str) -> None:
    await redis.delete(_key(sid))
```

Add the dependency alias in `app/api/deps.py`:

```python
from typing import Annotated
from fastapi import Depends
from redis.asyncio import Redis
from app.redis import get_redis

RedisDep = Annotated[Redis, Depends(get_redis)]
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `cd backend && python -m pytest tests/unit/test_auth_service.py tests/unit/test_session_store.py -q`
Expected: PASS (4 tests).

- [ ] **Step 8: Commit**

```bash
git add backend/pyproject.toml backend/app/config.py backend/app/redis.py backend/app/services/auth.py backend/app/api/deps.py backend/tests/unit/test_auth_service.py backend/tests/unit/test_session_store.py
git commit -m "feat(backend): redis session store + bcrypt password hashing"
```

---

### Task 2: User model, auth endpoints, `get_current_user`, test fixtures

**Files:**
- Modify: `backend/app/db/models.py` (add `User`), `backend/app/api/deps.py` (`get_current_user`), `backend/app/api/router.py` (include auth router), `backend/tests/conftest.py` (fakeredis override + `auth_client` fixture)
- Create: `backend/app/schemas/auth.py`, `backend/app/api/routers/auth.py`
- Create: `backend/tests/api/test_auth.py`

**Interfaces:**
- Consumes: `RedisDep`, `create_session`/`get_session_user_id`/`delete_session`, `hash_password`/`verify_password`.
- Produces: `User` model; `CurrentUserDep = Annotated[User, Depends(get_current_user)]`; `/auth/register`, `/auth/login`, `/auth/logout`, `/auth/me`; `UserOut` schema; conftest `auth_client` fixture → `(client, user_dict)`.

- [ ] **Step 1: Add the `User` model** — `backend/app/db/models.py` (append, keep imports)

```python
class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    display_name: Mapped[str] = mapped_column(String, nullable=False, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
```

- [ ] **Step 2: Add auth schemas** — `backend/app/schemas/auth.py`

```python
import uuid
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    display_name: str = ""


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: uuid.UUID
    email: str
    display_name: str
```

(If `EmailStr` raises "email-validator not installed", add `"pydantic[email]"` to deps and reinstall.)

- [ ] **Step 3: Add `get_current_user`** — `backend/app/api/deps.py`

```python
import uuid
from fastapi import Cookie, Depends, HTTPException
from sqlalchemy import select
from app.db.models import User
from app.redis import get_session_user_id

async def get_current_user(
    session: SessionDep, redis: RedisDep, sid: str | None = Cookie(default=None)
) -> User:
    if not sid:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user_id = await get_session_user_id(redis, sid)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Session expired")
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

CurrentUserDep = Annotated[User, Depends(get_current_user)]
```

- [ ] **Step 4: Write failing tests** — `backend/tests/api/test_auth.py`

```python
import pytest

REG = {"email": "a@example.com", "password": "s3cret!", "display_name": "A"}

@pytest.mark.asyncio
async def test_register_sets_cookie_and_me_returns_user(auth_client):
    client, user = auth_client
    assert user["email"] == "a@example.com"
    me = await client.get("/auth/me")
    assert me.status_code == 200
    assert me.json()["email"] == "a@example.com"

@pytest.mark.asyncio
async def test_me_without_cookie_is_401(client):
    res = await client.get("/auth/me")
    assert res.status_code == 401

@pytest.mark.asyncio
async def test_duplicate_email_is_409(client):
    assert (await client.post("/auth/register", json=REG)).status_code == 201
    assert (await client.post("/auth/register", json=REG)).status_code == 409

@pytest.mark.asyncio
async def test_login_wrong_password_is_401(client):
    await client.post("/auth/register", json=REG)
    res = await client.post("/auth/login", json={"email": REG["email"], "password": "wrong"})
    assert res.status_code == 401

@pytest.mark.asyncio
async def test_logout_clears_session(auth_client):
    client, _ = auth_client
    assert (await client.post("/auth/logout")).status_code == 204
    assert (await client.get("/auth/me")).status_code == 401
```

- [ ] **Step 5: Update conftest** — `backend/tests/conftest.py`

Add the fakeredis override to the `client` fixture and a new `auth_client` fixture. Inside the `client` fixture body, before yielding, override redis:

```python
from fakeredis.aioredis import FakeRedis
from app.redis import get_redis
# ... inside client fixture, alongside the get_session override:
    fake = FakeRedis(decode_responses=True)
    app.dependency_overrides[get_redis] = lambda: fake
```

Add a new fixture after `client`:

```python
@pytest_asyncio.fixture
async def auth_client(client):
    payload = {"email": "a@example.com", "password": "s3cret!", "display_name": "A"}
    res = await client.post("/auth/register", json=payload)
    assert res.status_code == 201, res.text
    return client, res.json()
```

(`AsyncClient` persists the `Set-Cookie` in its cookie jar, so subsequent `client` calls are authenticated.)

- [ ] **Step 6: Implement the auth router** — `backend/app/api/routers/auth.py`

```python
from fastapi import APIRouter, Cookie, HTTPException, Response, status
from sqlalchemy import select

from app.api.deps import CurrentUserDep, RedisDep, SessionDep
from app.config import get_settings
from app.db.models import User
from app.redis import create_session, delete_session
from app.schemas.auth import LoginRequest, RegisterRequest, UserOut
from app.services.auth import hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_cookie(response: Response, sid: str) -> None:
    s = get_settings()
    response.set_cookie(
        "sid", sid, max_age=s.session_ttl_seconds, httponly=True,
        samesite="lax", secure=s.cookie_secure, path="/",
    )


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, response: Response, session: SessionDep, redis: RedisDep):
    exists = (await session.execute(select(User).where(User.email == data.email))).scalar_one_or_none()
    if exists is not None:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(email=data.email, password_hash=hash_password(data.password), display_name=data.display_name)
    session.add(user)
    await session.commit()
    await session.refresh(user)
    # NOTE: starter-deck seeding is wired in Task 3 (needs Deck.user_id).
    sid = await create_session(redis, user.id)
    _set_cookie(response, sid)
    return user


@router.post("/login", response_model=UserOut)
async def login(data: LoginRequest, response: Response, session: SessionDep, redis: RedisDep):
    user = (await session.execute(select(User).where(User.email == data.email))).scalar_one_or_none()
    if user is None or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    sid = await create_session(redis, user.id)
    _set_cookie(response, sid)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(response: Response, redis: RedisDep, sid: str | None = Cookie(default=None)):
    if sid:
        await delete_session(redis, sid)
    response.delete_cookie("sid", path="/")


@router.get("/me", response_model=UserOut)
async def me(user: CurrentUserDep):
    return user
```

- [ ] **Step 7: Register the router** — `backend/app/api/router.py`, add:

```python
from app.api.routers import auth
api_router.include_router(auth.router)
```

- [ ] **Step 8: Run tests**

Run: `cd backend && python -m pytest tests/api/test_auth.py -q`
Expected: PASS (5 tests). Then run the FULL suite — existing tests still use the unauthenticated `client` and the un-scoped routers, so they must stay green: `python -m pytest -q`. Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add backend/app backend/tests/conftest.py backend/tests/api/test_auth.py
git commit -m "feat(backend): users + auth endpoints (register/login/logout/me) + get_current_user"
```

---

## Phase 2 — Backend per-user data scoping

### Task 3: `decks.user_id` + scope decks & cards + per-user seed + migration

**Files:**
- Modify: `backend/app/db/models.py` (`Deck.user_id`), `backend/app/services/decks.py`, `backend/app/services/cards.py`, `backend/app/services/importer.py`, `backend/app/seed.py`, `backend/app/api/routers/decks.py`, `backend/app/api/routers/cards.py`, `backend/app/api/routers/auth.py` (wire seed), `backend/main`/`app/main.py` (drop startup seed), the deck/card/import tests
- Create: Alembic migration `backend/migrations/versions/<rev>_users_and_deck_owner.py`
- Create: `backend/tests/api/test_isolation.py`

**Interfaces:**
- Consumes: `CurrentUserDep`, `User`.
- Produces: `Deck.user_id`; `seed_starter_deck(session, user_id: uuid.UUID) -> Deck`; all deck/card services take `user_id`; decks/cards routers require auth.

- [ ] **Step 1: Add the FK to the model** — `backend/app/db/models.py`, in `Deck`:

```python
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
```

- [ ] **Step 2: Write the isolation tests (failing)** — `backend/tests/api/test_isolation.py`

```python
import pytest

A = {"email": "a@example.com", "password": "pw1234", "display_name": "A"}
B = {"email": "b@example.com", "password": "pw1234", "display_name": "B"}

async def _register(client, who):
    # fresh cookie jar per client; register returns 201 + sets sid
    assert (await client.post("/auth/register", json=who)).status_code == 201

@pytest.mark.asyncio
async def test_user_a_cannot_see_or_touch_user_b_decks(client_factory):
    ca = await client_factory(); await _register(ca, A)
    cb = await client_factory(); await _register(cb, B)
    # B creates a deck
    deck = (await cb.post("/decks", json={"name": "B deck"})).json()
    # A lists decks: must NOT include B's
    a_list = (await ca.get("/decks")).json()
    assert all(d["id"] != deck["id"] for d in a_list)
    # A tries to read/update/delete B's deck → 404
    assert (await ca.get(f"/decks/{deck['id']}")).status_code == 404
    assert (await ca.patch(f"/decks/{deck['id']}", json={"name": "x"})).status_code == 404
    assert (await ca.delete(f"/decks/{deck['id']}")).status_code == 404

@pytest.mark.asyncio
async def test_register_seeds_a_starter_deck(auth_client):
    client, _ = auth_client
    decks = (await client.get("/decks")).json()
    assert len(decks) == 1 and decks[0]["count"] == 5
```

Add a `client_factory` fixture to conftest that builds independent clients (separate cookie jars) sharing the same DB engine + fakeredis:

```python
@pytest_asyncio.fixture
async def client_factory(engine):
    maker = async_sessionmaker(engine, expire_on_commit=False)
    fake = FakeRedis(decode_responses=True)
    async def _override():
        async with maker() as s:
            yield s
    app.dependency_overrides[get_session] = _override
    app.dependency_overrides[get_redis] = lambda: fake
    transport = ASGITransport(app=app)
    created = []
    async def _make():
        c = AsyncClient(transport=transport, base_url="http://test")
        created.append(c)
        return c
    yield _make
    for c in created:
        await c.aclose()
    app.dependency_overrides.clear()
```

- [ ] **Step 3: Run isolation tests to verify they fail**

Run: `cd backend && python -m pytest tests/api/test_isolation.py -q`
Expected: FAIL (routes not scoped / not authed / no seed yet).

- [ ] **Step 4: `seed_starter_deck`** — refactor `backend/app/seed.py`

Replace the `seed()` body with a per-user creator (keep `SEED_CARDS`/`split_phon`):

```python
async def seed_starter_deck(session, user_id) -> Deck:
    deck = Deck(name=SEED_DECK_NAME, topic=SEED_DECK_TOPIC, user_id=user_id)
    for item in SEED_CARDS:
        phonetic, pos = split_phon(item["phon"])
        deck.cards.append(Card(word=item["word"], phonetic=phonetic, pos=pos,
                               meaning=item["meaning"], example=item["example"]))
    session.add(deck)
    await session.commit()
    await session.refresh(deck, attribute_names=["cards"])
    return deck
```

Delete the old global `seed()`/`_run()`/`main()` (no longer used). In `backend/app/main.py`, remove the `if settings.seed_on_startup:` block and its import.

- [ ] **Step 5: Wire seeding into register** — `backend/app/api/routers/auth.py`, in `register` after `await session.refresh(user)`:

```python
    from app.seed import seed_starter_deck
    await seed_starter_deck(session, user.id)
```

- [ ] **Step 6: Scope decks** — `backend/app/services/decks.py`

Thread `user_id` through and filter:

```python
async def _get_or_404(session, deck_id, user_id) -> Deck:
    deck = await session.get(Deck, deck_id)
    if deck is None or deck.user_id != user_id:
        raise HTTPException(status_code=404, detail="Deck not found")
    return deck

async def list_decks(session, user_id) -> list[DeckOut]:
    now = datetime.now(timezone.utc)
    decks = (await session.execute(select(Deck).where(Deck.user_id == user_id))).scalars().all()
    return [_to_out(d, now) for d in decks]

async def create_deck(session, user_id, data: DeckCreate) -> DeckOut:
    deck = Deck(name=data.name, topic=data.topic, user_id=user_id)
    ...

# get_deck_detail / update_deck / delete_deck: add user_id param, call _get_or_404(session, deck_id, user_id)
```

`backend/app/api/routers/decks.py`: add `user: CurrentUserDep` to every handler and pass `user.id`. Example:

```python
@router.get("", response_model=list[DeckOut])
async def list_decks(session: SessionDep, user: CurrentUserDep):
    return await svc.list_decks(session, user.id)
```

For `/decks/import`: pass `user.id` into `importer.import_deck(session, payload, user.id)`.

- [ ] **Step 7: Scope importer** — `backend/app/services/importer.py`: add `user_id` param to `import_deck(...)`; set `Deck(..., user_id=user_id)` when creating the deck.

- [ ] **Step 8: Scope cards** — `backend/app/services/cards.py` + `backend/app/api/routers/cards.py`

Every card op verifies the parent deck belongs to the user. Add a helper:

```python
async def _user_deck_or_404(session, deck_id, user_id) -> Deck:
    deck = await session.get(Deck, deck_id)
    if deck is None or deck.user_id != user_id:
        raise HTTPException(status_code=404, detail="Deck not found")
    return deck
```

- `list_cards(session, deck_id, user_id)`: call `_user_deck_or_404` first.
- `add_card(session, deck_id, data, user_id)`: `_user_deck_or_404` first.
- `get_card_or_404`/`update_card`/`delete_card(session, card_id, user_id)`: fetch the card, then verify `card.deck.user_id == user_id` (load the deck via `session.get(Deck, card.deck_id)`); mismatch/None → 404.

Routers add `user: CurrentUserDep` and pass `user.id`.

- [ ] **Step 9: Write the migration** — generate then edit:

Run: `cd backend && alembic revision -m "users and deck owner"` (this sets `down_revision` to the current head automatically). Edit the new file's `upgrade()`/`downgrade()`:

```python
def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("email", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    # Existing dev decks are unowned — drop them (cascade removes cards + review_logs).
    op.execute("DELETE FROM decks")
    op.add_column("decks", sa.Column("user_id", sa.UUID(), nullable=False))
    op.create_index("ix_decks_user_id", "decks", ["user_id"])
    op.create_foreign_key("fk_decks_user_id", "decks", "users", ["user_id"], ["id"], ondelete="CASCADE")


def downgrade() -> None:
    op.drop_constraint("fk_decks_user_id", "decks", type_="foreignkey")
    op.drop_index("ix_decks_user_id", "decks")
    op.drop_column("decks", "user_id")
    op.drop_index("ix_users_email", "users")
    op.drop_table("users")
```

- [ ] **Step 10: Migrate existing deck/card/import tests to `auth_client`**

In `tests/api/test_decks.py`, `test_cards.py`, `test_import.py`: change the fixture from `client` to `auth_client` and unpack `client, _ = auth_client` (or use a small helper). Every request now carries auth. Where a test created a deck via direct DB `session` fixture, also stamp `user_id` — simplest is to create decks through the API (`POST /decks`) under `auth_client`, or pass the registered user's id. Adjust assertions that assumed the global seed deck (there is none now; the registered user has exactly the starter deck).

- [ ] **Step 11: Run tests**

Run: `cd backend && python -m pytest tests/api/test_decks.py tests/api/test_cards.py tests/api/test_import.py tests/api/test_isolation.py tests/api/test_auth.py -q`
Expected: PASS. (Do not run the whole suite yet — review/progress tests are migrated in Task 4.)

- [ ] **Step 12: Commit**

```bash
git add backend/app backend/migrations backend/tests
git commit -m "feat(backend): scope decks+cards to user, per-user starter seed, users migration"
```

---

### Task 4: Scope review & progress

**Files:**
- Modify: `backend/app/services/review.py`, `backend/app/services/progress.py`, `backend/app/api/routers/review.py`, `backend/app/api/routers/progress.py`, the review/grade/progress/reset/seed tests
- Modify: `backend/tests/api/test_isolation.py` (add review/progress isolation)

**Interfaces:**
- Consumes: `CurrentUserDep`, `Deck.user_id`.
- Produces: review/progress services take `user_id` and filter via the `decks` join.

- [ ] **Step 1: Add review/progress isolation tests (failing)** — append to `tests/api/test_isolation.py`

```python
@pytest.mark.asyncio
async def test_grade_foreign_card_is_404(client_factory):
    ca = await client_factory(); await _register(ca, A)
    cb = await client_factory(); await _register(cb, B)
    b_deck = (await cb.get("/decks")).json()[0]               # B's starter deck
    b_card = (await cb.get(f"/decks/{b_deck['id']}/cards")).json()[0]
    res = await ca.post("/review/grade", json={
        "card_id": b_card["id"], "rating": "remember", "mode": "flash", "is_correct": None})
    assert res.status_code == 404

@pytest.mark.asyncio
async def test_progress_summary_counts_only_own_cards(client_factory):
    ca = await client_factory(); await _register(ca, A)
    s = (await ca.get("/progress/summary")).json()
    # A's starter deck has 5 cards, all new/due; summary reflects only A's data
    assert s["due_total"] == 5
```

- [ ] **Step 2: Run to verify failure**

Run: `cd backend && python -m pytest tests/api/test_isolation.py -q`
Expected: FAIL (review/progress not scoped yet).

- [ ] **Step 3: Scope review** — `backend/app/services/review.py`

`assemble_session(session, user_id, deck_id, limit)`: every `select(Card)` becomes `select(Card).join(Deck).where(Deck.user_id == user_id)` (and keep the optional `Card.deck_id == deck_id` filter). `grade_card(session, user_id, req)`: load the card, verify its deck belongs to the user (`session.get(Deck, card.deck_id)` → `.user_id == user_id`), else `HTTPException(404)`. Router `review.py`: add `user: CurrentUserDep`, pass `user.id`.

- [ ] **Step 4: Scope progress** — `backend/app/services/progress.py`

Add `user_id` to `summary`/`heatmap`/`needs_review`/`word_of_day`/`recent_cards`/`reset_progress`. Every `select(Card)` → `select(Card).join(Deck).where(Deck.user_id == user_id)`. The heatmap `select(ReviewLog.reviewed_at)` → join `ReviewLog.card_id == Card.id`, `Card.deck_id == Deck.id`, filter `Deck.user_id == user_id`. `reset_progress` only updates/deletes the user's cards/logs (filter the same way). Router `progress.py`: add `user: CurrentUserDep` to all handlers; pass `user.id`.

- [ ] **Step 5: Migrate review/progress tests to `auth_client`** — `tests/api/test_review.py`, `test_grade.py`, `test_progress.py`, `test_reset.py`, `test_seed.py`: switch to `auth_client`; build data through the API or stamp `user_id`; adjust counts to the per-user starter deck (5 cards). `test_seed.py` now asserts `seed_starter_deck` creates a user-owned deck (register → 1 deck, 5 cards).

- [ ] **Step 6: Run the FULL backend suite**

Run: `cd backend && python -m pytest -q`
Expected: all PASS (including the unit + isolation tests).

- [ ] **Step 7: Commit**

```bash
git add backend/app backend/tests
git commit -m "feat(backend): scope review+progress to user, isolation tests green"
```

---

## Phase 3 — Frontend thin BFF

### Task 5: `apiFetch` cookie forwarding + `middleware.ts` + drop client guard

**Files:**
- Modify: `frontend/src/lib/api.ts` (`apiFetch` forwards cookie), `frontend/src/components/AppShell.tsx` (remove guard)
- Create: `frontend/src/middleware.ts`, `frontend/src/middleware.test.ts`

**Interfaces:**
- Produces: a `middleware` matching protected routes; `apiFetch` that forwards `sid`.

- [ ] **Step 1: Write the middleware test (failing)** — `frontend/src/middleware.test.ts`

```ts
import { describe, it, expect, vi } from 'vitest'
import { middleware } from './middleware'

function req(path: string, sid?: string) {
  const headers = new Headers()
  if (sid) headers.set('cookie', `sid=${sid}`)
  return { nextUrl: new URL(`http://localhost:3000${path}`), url: `http://localhost:3000${path}`,
           cookies: { get: (n: string) => (sid && n === 'sid' ? { value: sid } : undefined) } } as never
}

describe('middleware', () => {
  it('redirects unauthenticated protected route to /login', () => {
    const res = middleware(req('/library'))
    expect(res.headers.get('location')).toContain('/login')
  })
  it('redirects authenticated /login to /', () => {
    const res = middleware(req('/login', 'abc'))
    expect(res.headers.get('location')).toBe('http://localhost:3000/')
  })
  it('lets authenticated protected route through', () => {
    const res = middleware(req('/library', 'abc'))
    expect(res.headers.get('location')).toBeNull()
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `cd frontend && npx vitest run src/middleware.test.ts`
Expected: FAIL (no `./middleware`).

- [ ] **Step 3: Implement `frontend/src/middleware.ts`**

```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const sid = req.cookies.get('sid')?.value
  const { pathname } = req.nextUrl
  const isLogin = pathname === '/login'
  if (isLogin && sid) return NextResponse.redirect(new URL('/', req.url))
  if (!isLogin && !sid) {
    const url = new URL('/login', req.url)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  // everything except api, next internals, and static files
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 4: Forward the cookie in `apiFetch`** — `frontend/src/lib/api.ts`, replace the `apiFetch` body:

```ts
import { cookies } from 'next/headers'

export async function apiFetch<T>(path: string): Promise<T> {
  const sid = (await cookies()).get('sid')?.value
  const res = await fetch(`${BACKEND}${path}`, {
    cache: 'no-store',
    headers: sid ? { cookie: `sid=${sid}` } : {},
  })
  if (!res.ok) throw new ApiError(res.status, res.statusText)
  return (await res.json()) as T
}
```

(`cookies()` is async in Next 15. `apiFetch` is only called from server components, so this is safe.)

- [ ] **Step 5: Remove the AppShell client guard** — `frontend/src/components/AppShell.tsx`

Delete the `isAuthenticated`/`_hasHydrated`/`usePathname` guard logic and the two early returns (`if (!hasHydrated) return null`, `if (!isAuthenticated) return null`) plus the redirect `useEffect`. Keep the tour effect and the shell JSX. AppShell returns to: `'use client'`, tour effect, render Sidebar + main(Topbar + children) + GuidedTourOverlay. (Route protection now lives in `middleware.ts`.) Remove now-unused imports (`useRouter`, `usePathname`, `useAppStore` if only used for auth).

- [ ] **Step 6: Run tests**

Run: `cd frontend && npx vitest run src/middleware.test.ts src/components/AppShell.test.tsx`
Expected: PASS. (Update `AppShell.test.tsx` if it asserted guard behavior — it should now just assert the shell renders.)

- [ ] **Step 7: Commit**

```bash
git add frontend/src/middleware.ts frontend/src/middleware.test.ts frontend/src/lib/api.ts frontend/src/components/AppShell.tsx frontend/src/components/AppShell.test.tsx
git commit -m "feat(frontend): middleware auth guard + apiFetch cookie forwarding (drop client guard)"
```

---

### Task 6: Rewrite AuthScreen (real email/password)

**Files:**
- Modify: `frontend/src/features/auth/AuthScreen.tsx`, `frontend/src/features/auth/auth.test.tsx`

**Interfaces:**
- Consumes: `apiPost` (client write through `/api`), `useRouter`.

- [ ] **Step 1: Write failing tests** — `frontend/src/features/auth/auth.test.tsx` (replace)

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AuthScreen from './AuthScreen'
import * as api from '../../lib/api'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }))
afterEach(() => { vi.restoreAllMocks(); push.mockClear() })

describe('AuthScreen (real auth)', () => {
  it('logs in via /auth/login then navigates home', async () => {
    const spy = vi.spyOn(api, 'apiPost').mockResolvedValue({} as never)
    render(<AuthScreen />)
    fireEvent.change(screen.getByLabelText('email'), { target: { value: 'a@example.com' } })
    fireEvent.change(screen.getByLabelText('password'), { target: { value: 's3cret!' } })
    fireEvent.click(screen.getByRole('button', { name: /Đăng nhập/i }))
    await vi.waitFor(() => expect(spy).toHaveBeenCalledWith('/auth/login',
      { email: 'a@example.com', password: 's3cret!' }))
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/'))
  })

  it('shows a Vietnamese error on 401', async () => {
    vi.spyOn(api, 'apiPost').mockRejectedValue(new api.ApiError(401, 'Invalid credentials'))
    render(<AuthScreen />)
    fireEvent.change(screen.getByLabelText('email'), { target: { value: 'a@example.com' } })
    fireEvent.change(screen.getByLabelText('password'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: /Đăng nhập/i }))
    await screen.findByText(/Email hoặc mật khẩu không đúng/i)
  })
})
```

- [ ] **Step 2: Run to verify failure**

Run: `cd frontend && npx vitest run src/features/auth/auth.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Rewrite `AuthScreen.tsx`** — keep the existing layout/styles; replace the form logic. Remove the Google button. Add controlled `email`/`password` (+ signup `displayName`/`confirm`) state with `aria-label="email"`/`"password"`. Submit:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiPost, ApiError } from '../../lib/api'
// ...
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!isLogin && pw !== confirmPw) { setError('Mật khẩu nhập lại không khớp'); return }
    try {
      if (isLogin) await apiPost('/auth/login', { email, password: pw })
      else await apiPost('/auth/register', { email, password: pw, display_name: name })
      router.push('/'); router.refresh()
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError('Email hoặc mật khẩu không đúng')
      else if (err instanceof ApiError && err.status === 409) setError('Email đã được đăng ký')
      else setError('Lỗi kết nối — thử lại sau')
    }
  }
```

Wire `email` input (`aria-label="email"`, type email), `password` input (`aria-label="password"`, type password), and (signup) name + confirm. The submit button text is `t.loginBtn`/`Đăng nhập` (login) or signup equivalent. Render `{error && <div role="alert">{error}</div>}`.

- [ ] **Step 4: Run tests**

Run: `cd frontend && npx vitest run src/features/auth/auth.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/auth
git commit -m "feat(frontend): real email/password AuthScreen (login/register via /api/auth)"
```

---

### Task 7: Remove fake-auth store seam + real logout + display name

**Files:**
- Modify: `frontend/src/store/useAppStore.ts`, `frontend/src/store/types.ts`, `frontend/src/components/layout/SettingsPanel.tsx`, `frontend/src/components/layout/layout.test.tsx`
- Modify (greeting): `frontend/src/app/page.tsx` + the dashboard greeting component, to read `display_name` from `/auth/me`

**Interfaces:**
- Consumes: `apiFetch<{display_name:string}>('/auth/me')` (server), `apiPost('/auth/logout')` (client).

- [ ] **Step 1: Remove fake-auth fields** — `frontend/src/store/types.ts` + `useAppStore.ts`

Remove `isAuthenticated`, `login`, `logout`, `_hasHydrated` (and `hasOnboarded`/`completeOnboarding` if a grep shows no remaining non-test use). Remove them from `initialState`, `PERSIST_KEYS`, and `onRehydrateStorage` (drop the `_hasHydrated` setState; keep `applyTheme`). Run a grep first: `grep -rn "isAuthenticated\|_hasHydrated\|completeOnboarding\|\.login(\|s.login\b" frontend/src` and fix every non-test caller.

- [ ] **Step 2: Real logout** — `frontend/src/components/layout/SettingsPanel.tsx`

Replace the `logout` store action usage with a handler:

```tsx
import { useRouter } from 'next/navigation'
import { apiPost } from '../../lib/api'
// ...
  const router = useRouter()
  const handleLogout = async () => {
    try { await apiPost('/auth/logout') } catch { /* ignore */ }
    router.push('/login'); router.refresh()
  }
```

Wire the existing logout button `onClick={handleLogout}`.

- [ ] **Step 2b: Update `layout.test.tsx`** — the "logout action" test now asserts `apiPost('/auth/logout')` is called and `router.push('/login')` happens (mock `apiPost` + `next/navigation`), instead of the old store-flag assertion.

- [ ] **Step 3: Display name from `/auth/me`** — `frontend/src/app/page.tsx`

Add `/auth/me` to the server fetches (`apiFetch<{display_name: string; email: string}>('/auth/me').catch(() => null)`), pass `displayName` into the dashboard greeting component (replacing any hardcoded name). Keep the greeting copy Vietnamese.

- [ ] **Step 4: Run tests**

Run: `cd frontend && npx vitest run`
Expected: all PASS (fake-auth tests removed/updated). Fix any test still referencing removed store fields.

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "feat(frontend): real logout + display name; remove fake-auth store seam"
```

---

## Phase 4 — Infra + end-to-end verification

### Task 8: Redis service, env, CORS, e2e verify

**Files:**
- Modify: `docker-compose.yml` (add `redis`; backend `depends_on` + env), `backend/app/config.py` defaults already set (Task 1), `.env`/compose env for `REDIS_URL`, `COOKIE_SECURE`, `CORS_ORIGINS`

- [ ] **Step 1: Add Redis to `docker-compose.yml`**

```yaml
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
```

Add to the `api` service: `depends_on: redis` (and db), env `REDIS_URL=redis://redis:6379/0`, `COOKIE_SECURE=false` (dev), and bump `CORS_ORIGINS=["http://localhost:3000"]`.

- [ ] **Step 2: Apply the migration against the real DB**

Run (with db up): `cd backend && alembic upgrade head`
Expected: creates `users`, drops dev decks, adds `decks.user_id`. No error.

- [ ] **Step 3: End-to-end verification** (manual, via the run/verify flow)

Bring up `docker compose up db api redis` + `npm --prefix frontend run dev`. Then:
1. `curl -i -c /tmp/jar -X POST localhost:3000/api/auth/register -H 'content-type: application/json' -d '{"email":"e2e@x.com","password":"pw1234","display_name":"E2E"}'` → 201 + `Set-Cookie: sid=...`.
2. `curl -b /tmp/jar localhost:3000/api/decks` → the user's starter deck (5 cards).
3. `curl -b /tmp/jar localhost:3000/api/auth/me` → the user.
4. `curl localhost:3000/api/decks` (no cookie) → 401.
5. Browser: visiting `/library` unauthenticated redirects to `/login`; after register/login the screens render the user's data; logout returns to `/login`.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml
git commit -m "build: redis service + auth env (REDIS_URL, COOKIE_SECURE, CORS 3000)"
```

---

## Self-Review Notes (coverage vs spec)

- Spec §4.1 (User + migration) → Task 2 + Task 3 (migration). §4.2 (Redis sessions) → Task 1. §4.3 (`get_current_user`) → Task 2. §4.4 (auth endpoints) → Task 2 (+ register seed in Task 3). §4.5 (per-user seed) → Task 3. §4.6 (scoping every router) → Tasks 3–4 + the isolation tests. §5.1 (middleware) → Task 5. §5.2 (AuthScreen) → Task 6. §5.3 (apiFetch forwarding) → Task 5. §5.4 (remove fake seam + logout + display name) → Task 7. §6 (tests) → per task + `test_isolation.py`. §infra (redis/CORS) → Task 8. §9 done-criteria → Task 8 Step 3.
- **bcrypt-direct** deviates from the spec's "passlib[bcrypt]" wording — intentional, to avoid the passlib/bcrypt≥4.1 warning (noted in Global Constraints).
- Verified `apiGet`/`apiPost`/`apiFetch` stay in `lib/api.ts`; only `apiFetch` gains cookie forwarding.
