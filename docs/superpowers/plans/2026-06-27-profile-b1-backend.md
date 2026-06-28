# Profile B1 — Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add the backend for the Profile screen — user goal/level columns, and a composite `GET /profile` (stats + achievements) plus `PATCH /profile` (edit name/username/level/goal).

**Architecture:** Four columns on `User` (1:1, with defaults) + an Alembic migration. A new `profile` service computes stats (from cards + review logs) and achievements (longest streak, distinct review days, mastered count, CEFR level), exposed via a `profile` router. Reuses `srs.mastery()` and the app timezone; PATCH reuses the username validation rules from auth.

**Tech Stack:** FastAPI + async SQLAlchemy 2 + Alembic + Pydantic v2, run via `uv`. Postgres for tests, fakeredis.

## Global Constraints

- All backend commands run from `backend/` via `uv` (`uv run pytest`, `uv run alembic …`). Tests need Postgres at `postgresql+asyncpg://snoopify:snoopify@localhost:5432/snoopify_test` and use fakeredis. Tests build schema from the models via `Base.metadata.create_all` (NOT migrations); the Alembic migration is for the real DB. **If Postgres is unavailable, write + commit the code and tests and report DONE_WITH_CONCERNS with the exact command — do not fake results.**
- CEFR levels: exactly `["A1","A2","B1","B2","C1","C2"]`, ranked by list index. Store the code; validate membership.
- Stats: `learned` = cards with `repetitions > 0` (learning+proficient); `mastered` = proficient (`srs.mastery` == "proficient"); `streak` = current streak (consecutive days up to today with ≥1 review); `accuracy` = `round(100*correct/total)` over `ReviewLog` rows with `is_correct IS NOT NULL`, else `0`.
- Achievements (6 keys, fixed order): `streak7` (longest≥7), `mastered100` (mastered≥100), `sessions10` (distinct review days≥10), `streak30` (longest≥30), `mastered500` (mastered≥500), `b2` (rank(level)≥rank("B2")). Longest streak + distinct days are computed over **all** review dates.
- `PATCH /profile`: email is read-only; username uniqueness check **excludes the current user**; reuse username rules (lowercase, regex `^[A-Za-z0-9_.]+$`, len 3–30).
- Migration `down_revision` is the current head `c9527628c583` (the username migration).
- Branch: `feat/profile-spec-b` (already checked out, based on main).

---

### Task 1: User profile columns + migration + CEFR constant

**Files:**
- Modify: `backend/app/db/models.py` (4 columns on `User`)
- Modify: `backend/app/enums.py` (CEFR_LEVELS)
- Create: `backend/migrations/versions/<generated>_add_profile_fields.py`
- Modify: `backend/tests/api/test_models.py` (defaults test)

**Interfaces:**
- Produces: `User.level` (str, default "B1"), `User.level_target` (str, "B2"), `User.goal_text` (str, ""), `User.daily_target` (int, 20); `app.enums.CEFR_LEVELS`.

- [ ] **Step 1: Write the failing test**

Add to `backend/tests/api/test_models.py`:

```python
@pytest.mark.asyncio
async def test_user_profile_defaults(session):
    from app.db.models import User
    user = User(email="defaults@example.com", username="defaultsuser", password_hash="x", display_name="D")
    session.add(user)
    await session.flush()
    await session.refresh(user)
    assert user.level == "B1"
    assert user.level_target == "B2"
    assert user.goal_text == ""
    assert user.daily_target == 20
```

(If `pytest` / `User` are not already imported at the top of the file, add `import pytest` and rely on the in-test import shown.)

- [ ] **Step 2: Run test to verify it fails**

Run (from `backend/`): `uv run pytest tests/api/test_models.py::test_user_profile_defaults -q`
Expected: FAIL — `AttributeError: 'User' object has no attribute 'level'`. (If Postgres is down: STOP, report the connection error.)

- [ ] **Step 3: Add the columns to the model**

In `backend/app/db/models.py`, in `class User`, add after `display_name`:

```python
    display_name: Mapped[str] = mapped_column(String, nullable=False, default="")
    level: Mapped[str] = mapped_column(String, nullable=False, default="B1")
    level_target: Mapped[str] = mapped_column(String, nullable=False, default="B2")
    goal_text: Mapped[str] = mapped_column(String, nullable=False, default="")
    daily_target: Mapped[int] = mapped_column(Integer, nullable=False, default=20)
```

(`Integer` and `String` are already imported in this file.)

- [ ] **Step 4: Add the CEFR constant**

In `backend/app/enums.py`, append:

```python
CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"]
```

- [ ] **Step 5: Run test to verify it passes**

Run (from `backend/`): `uv run pytest tests/api/test_models.py -q`
Expected: PASS. Then `uv run pytest -q` → full suite still green (defaults don't break register/auth).

- [ ] **Step 6: Create the Alembic migration**

From `backend/`: `uv run alembic revision -m "add profile fields"` (creates a file with `down_revision = 'c9527628c583'`). Edit its `upgrade`/`downgrade`:

```python
def upgrade() -> None:
    op.add_column("users", sa.Column("level", sa.String(), nullable=False, server_default="B1"))
    op.add_column("users", sa.Column("level_target", sa.String(), nullable=False, server_default="B2"))
    op.add_column("users", sa.Column("goal_text", sa.String(), nullable=False, server_default=""))
    op.add_column("users", sa.Column("daily_target", sa.Integer(), nullable=False, server_default="20"))


def downgrade() -> None:
    op.drop_column("users", "daily_target")
    op.drop_column("users", "goal_text")
    op.drop_column("users", "level_target")
    op.drop_column("users", "level")
```

Confirm `uv run alembic heads` shows the new revision as the single head.

- [ ] **Step 7: Commit**

```bash
git add backend/app/db/models.py backend/app/enums.py backend/migrations/versions/ backend/tests/api/test_models.py
git commit -m "feat(backend): add profile fields (level, goal) to users

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `GET /profile` — stats + achievements

**Files:**
- Create: `backend/app/schemas/profile.py`
- Create: `backend/app/services/profile.py`
- Create: `backend/app/api/routers/profile.py`
- Modify: `backend/app/api/router.py` (register the router)
- Create: `backend/tests/api/test_profile.py`

**Interfaces:**
- Consumes: `User.level/level_target/goal_text/daily_target` + `CEFR_LEVELS` (Task 1); `srs.mastery`; `Card`, `Deck`, `ReviewLog`.
- Produces: `ProfileOut` (consumed by the frontend B2). `app.services.profile.get_profile(session, user) -> ProfileOut`.

- [ ] **Step 1: Write the schemas**

Create `backend/app/schemas/profile.py`:

```python
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class ProfileStats(BaseModel):
    learned: int
    mastered: int
    streak: int
    accuracy: int


class Achievement(BaseModel):
    key: str
    earned: bool


class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    display_name: str
    username: str
    email: str
    created_at: datetime
    level: str
    level_target: str
    goal_text: str
    daily_target: int
    stats: ProfileStats
    achievements: list[Achievement]
```

- [ ] **Step 2: Write the failing test**

Create `backend/tests/api/test_profile.py`:

```python
import pytest


@pytest.mark.asyncio
async def test_get_profile_shape_for_fresh_user(auth_client):
    client, _ = auth_client
    res = await client.get("/profile")
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["username"] == "user_a"
    assert body["level"] == "B1"
    assert body["level_target"] == "B2"
    assert body["daily_target"] == 20
    # fresh user from auth_client has a seeded starter deck (5 new cards), no reviews
    assert body["stats"]["learned"] == 0
    assert body["stats"]["mastered"] == 0
    assert body["stats"]["streak"] == 0
    assert body["stats"]["accuracy"] == 0
    keys = [a["key"] for a in body["achievements"]]
    assert keys == ["streak7", "mastered100", "sessions10", "streak30", "mastered500", "b2"]
    assert all(a["earned"] is False for a in body["achievements"])


@pytest.mark.asyncio
async def test_get_profile_requires_auth(client):
    res = await client.get("/profile")
    assert res.status_code == 401
```

- [ ] **Step 3: Run test to verify it fails**

Run (from `backend/`): `uv run pytest tests/api/test_profile.py -q`
Expected: FAIL — 404 (route not registered yet).

- [ ] **Step 4: Write the service**

Create `backend/app/services/profile.py`:

```python
import uuid
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import case, func, select

from app.config import get_settings
from app.db.models import Card, Deck, ReviewLog, User
from app.enums import CEFR_LEVELS
from app.schemas.profile import Achievement, ProfileOut, ProfileStats
from app.services.srs import mastery


def _tz() -> ZoneInfo:
    return ZoneInfo(get_settings().app_timezone)


async def _mastery_counts(session, user_id: uuid.UUID) -> dict:
    cards = (
        await session.execute(select(Card).join(Deck).where(Deck.user_id == user_id))
    ).scalars().all()
    counts = {"new": 0, "learning": 0, "proficient": 0}
    for c in cards:
        counts[mastery(c.repetitions, c.interval_days)] += 1
    return counts


async def _accuracy(session, user_id: uuid.UUID) -> int:
    row = (
        await session.execute(
            select(
                func.count().label("total"),
                func.coalesce(func.sum(case((ReviewLog.is_correct.is_(True), 1), else_=0)), 0).label("correct"),
            )
            .select_from(ReviewLog)
            .join(Card, ReviewLog.card_id == Card.id)
            .join(Deck, Card.deck_id == Deck.id)
            .where(Deck.user_id == user_id)
            .where(ReviewLog.is_correct.is_not(None))
        )
    ).one()
    total = row.total or 0
    return round(100 * row.correct / total) if total else 0


async def _review_dates(session, user_id: uuid.UUID) -> list:
    rows = (
        await session.execute(
            select(ReviewLog.reviewed_at)
            .join(Card, ReviewLog.card_id == Card.id)
            .join(Deck, Card.deck_id == Deck.id)
            .where(Deck.user_id == user_id)
        )
    ).scalars().all()
    tz = _tz()
    return sorted({dt.astimezone(tz).date() for dt in rows})


def _current_streak(dateset: set, today) -> int:
    streak = 0
    cursor = today
    while cursor in dateset:
        streak += 1
        cursor = cursor - timedelta(days=1)
    return streak


def _longest_streak(dates: list) -> int:
    longest = run = 0
    prev = None
    for d in dates:
        run = run + 1 if prev is not None and (d - prev).days == 1 else 1
        longest = max(longest, run)
        prev = d
    return longest


def _achievements(mastered: int, longest: int, distinct_days: int, level: str) -> list[Achievement]:
    level_rank = CEFR_LEVELS.index(level) if level in CEFR_LEVELS else 0
    b2_rank = CEFR_LEVELS.index("B2")
    flags = {
        "streak7": longest >= 7,
        "mastered100": mastered >= 100,
        "sessions10": distinct_days >= 10,
        "streak30": longest >= 30,
        "mastered500": mastered >= 500,
        "b2": level_rank >= b2_rank,
    }
    order = ["streak7", "mastered100", "sessions10", "streak30", "mastered500", "b2"]
    return [Achievement(key=k, earned=flags[k]) for k in order]


async def get_profile(session, user: User) -> ProfileOut:
    counts = await _mastery_counts(session, user.id)
    learned = counts["learning"] + counts["proficient"]
    mastered = counts["proficient"]
    accuracy = await _accuracy(session, user.id)

    dates = await _review_dates(session, user.id)
    dateset = set(dates)
    today = datetime.now(_tz()).date()
    streak = _current_streak(dateset, today)
    longest = _longest_streak(dates)
    distinct_days = len(dates)

    return ProfileOut(
        display_name=user.display_name,
        username=user.username,
        email=user.email,
        created_at=user.created_at,
        level=user.level,
        level_target=user.level_target,
        goal_text=user.goal_text,
        daily_target=user.daily_target,
        stats=ProfileStats(learned=learned, mastered=mastered, streak=streak, accuracy=accuracy),
        achievements=_achievements(mastered, longest, distinct_days, user.level),
    )
```

- [ ] **Step 5: Write the router and register it**

Create `backend/app/api/routers/profile.py`:

```python
from fastapi import APIRouter

from app.api.deps import CurrentUserDep, SessionDep
from app.schemas.profile import ProfileOut
from app.services import profile as svc

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("", response_model=ProfileOut)
async def get_profile(session: SessionDep, user: CurrentUserDep):
    return await svc.get_profile(session, user)
```

In `backend/app/api/router.py`, add `profile` to the import and include it:

```python
from app.api.routers import auth, cards, decks, health, profile, progress, review
```
```python
api_router.include_router(progress.dashboard_router)
api_router.include_router(profile.router)
```

- [ ] **Step 6: Run tests to verify they pass**

Run (from `backend/`): `uv run pytest tests/api/test_profile.py -q` → PASS. Then `uv run pytest -q` → full suite green.

- [ ] **Step 7: Commit**

```bash
git add backend/app/schemas/profile.py backend/app/services/profile.py backend/app/api/routers/profile.py backend/app/api/router.py backend/tests/api/test_profile.py
git commit -m "feat(backend): GET /profile with computed stats and achievements

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: `PATCH /profile` — edit name/username/level/goal

**Files:**
- Modify: `backend/app/schemas/profile.py` (ProfileUpdate)
- Modify: `backend/app/services/profile.py` (update_profile)
- Modify: `backend/app/api/routers/profile.py` (PATCH)
- Modify: `backend/tests/api/test_profile.py` (PATCH tests)

**Interfaces:**
- Consumes: `get_profile` (returns the updated `ProfileOut`); `CEFR_LEVELS`.
- Produces: `PATCH /profile` accepting `ProfileUpdate`, returning `ProfileOut`.

- [ ] **Step 1: Write the failing tests**

Add to `backend/tests/api/test_profile.py`:

```python
PATCH_BODY = {
    "display_name": "Minh",
    "username": "minh_dev",
    "level": "B2",
    "level_target": "C1",
    "goal_text": "Speak fluently at work",
    "daily_target": 30,
}


@pytest.mark.asyncio
async def test_patch_profile_updates_fields(auth_client):
    client, _ = auth_client
    res = await client.patch("/profile", json=PATCH_BODY)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["display_name"] == "Minh"
    assert body["username"] == "minh_dev"
    assert body["level"] == "B2"
    assert body["level_target"] == "C1"
    assert body["goal_text"] == "Speak fluently at work"
    assert body["daily_target"] == 30
    # level B2 unlocks the b2 achievement
    assert any(a["key"] == "b2" and a["earned"] for a in body["achievements"])


@pytest.mark.asyncio
async def test_patch_profile_keeping_own_username_is_ok(auth_client):
    client, _ = auth_client
    res = await client.patch("/profile", json={**PATCH_BODY, "username": "user_a"})
    assert res.status_code == 200, res.text


@pytest.mark.asyncio
async def test_patch_profile_rejects_invalid_level(auth_client):
    client, _ = auth_client
    res = await client.patch("/profile", json={**PATCH_BODY, "level": "Z9"})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_patch_profile_duplicate_username_is_409(client):
    # register a second user, then try to take their username from the first
    await client.post("/auth/register", json={"email": "a@example.com", "username": "user_a", "password": "s3cret!", "display_name": "A"})
    # second user in a separate client/session reusing the same app overrides
    await client.post("/auth/logout")
    await client.post("/auth/register", json={"email": "b@example.com", "username": "taken_name", "password": "s3cret!", "display_name": "B"})
    # now logged in as B; try to rename B to A's username
    res = await client.patch("/profile", json={**PATCH_BODY, "username": "user_a"})
    assert res.status_code == 409
    assert "username" in res.json()["detail"].lower()
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `backend/`): `uv run pytest tests/api/test_profile.py -k patch -q`
Expected: FAIL — 405 Method Not Allowed (no PATCH route).

- [ ] **Step 3: Add the update schema**

In `backend/app/schemas/profile.py`, add (import `Field`, `field_validator`, and `CEFR_LEVELS`):

```python
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.enums import CEFR_LEVELS
```
```python
class ProfileUpdate(BaseModel):
    display_name: str = Field(max_length=120)
    username: str = Field(min_length=3, max_length=30, pattern=r"^[A-Za-z0-9_.]+$")
    level: str
    level_target: str
    goal_text: str = Field(default="", max_length=200)
    daily_target: int = Field(ge=1, le=500)

    @field_validator("username")
    @classmethod
    def _lower(cls, v: str) -> str:
        return v.lower()

    @field_validator("level", "level_target")
    @classmethod
    def _cefr(cls, v: str) -> str:
        if v not in CEFR_LEVELS:
            raise ValueError("invalid CEFR level")
        return v
```

- [ ] **Step 4: Add the update service**

In `backend/app/services/profile.py`, add (extend imports with `HTTPException` and `ProfileUpdate`):

```python
from fastapi import HTTPException

from app.schemas.profile import Achievement, ProfileOut, ProfileStats, ProfileUpdate
```
```python
async def update_profile(session, user: User, data: ProfileUpdate) -> ProfileOut:
    clash = (
        await session.execute(
            select(User).where(User.username == data.username, User.id != user.id)
        )
    ).scalar_one_or_none()
    if clash is not None:
        raise HTTPException(status_code=409, detail="Username already taken")
    user.display_name = data.display_name
    user.username = data.username
    user.level = data.level
    user.level_target = data.level_target
    user.goal_text = data.goal_text
    user.daily_target = data.daily_target
    await session.commit()
    await session.refresh(user)
    return await get_profile(session, user)
```

- [ ] **Step 5: Add the PATCH route**

In `backend/app/api/routers/profile.py`, extend imports and add the route:

```python
from app.schemas.profile import ProfileOut, ProfileUpdate
```
```python
@router.patch("", response_model=ProfileOut)
async def update_profile(data: ProfileUpdate, session: SessionDep, user: CurrentUserDep):
    return await svc.update_profile(session, user, data)
```

- [ ] **Step 6: Run tests to verify they pass**

Run (from `backend/`): `uv run pytest tests/api/test_profile.py -q` → PASS. Then `uv run pytest -q` → full suite green.

- [ ] **Step 7: Commit**

```bash
git add backend/app/schemas/profile.py backend/app/services/profile.py backend/app/api/routers/profile.py backend/tests/api/test_profile.py
git commit -m "feat(backend): PATCH /profile to edit name, username, level and goal

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Final verification

- [ ] From `backend/` (Postgres up): `uv run pytest -q` → all pass; `uv run alembic upgrade head` then `uv run alembic downgrade -1` applies/reverts the profile migration cleanly.
- [ ] `uv run ruff check` → clean for the new files.

## Self-review (coverage vs spec §4, §5, §7)

- §4 data model → Task 1 (4 columns + migration + CEFR). ✓
- §5 `GET /profile` (stats + achievements) → Task 2. ✓
- §5 `PATCH /profile` (uniqueness excl. self, CEFR validation, email read-only) → Task 3. ✓
- §7 backend tests (stats, accuracy 0, achievement keys/order, b2 by level, PATCH 409/422/own-username) → Tasks 2 + 3. ✓
- Stat/achievement definitions match Global Constraints. Type names (`ProfileOut`, `ProfileStats`, `Achievement`, `ProfileUpdate`, achievement keys/order) consistent across tasks. ✓
