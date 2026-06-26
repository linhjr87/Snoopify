# FE PR2 — Username Login + Brand Rename Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let users register with a required username and log in with either their email or username in a single field; rename the auth-screen brand from "myEnglish" to "Snoopify".

**Architecture:** Backend adds a `username` column (unique, lowercased) to `users` with an Alembic migration; register requires & dedupes it; login resolves an `identifier` to email (if it contains `@`) or username. Frontend `AuthScreen` gains a username field on register and a single email-or-username field on login, plus the brand rename. All on branch `feat/fe-improvements-spec-a` (PR1 already landed there).

**Tech Stack:** Backend FastAPI + SQLAlchemy (async) + Alembic + Pydantic v2, run via `uv`; Postgres for tests. Frontend Next 15 + React 18 + Zustand 4 + Vitest 4.

## Global Constraints

- Backend commands run from `backend/` via `uv` (e.g. `uv run pytest`, `uv run alembic …`). Backend tests need Postgres at `postgresql+asyncpg://snoopify:snoopify@localhost:5432/snoopify_test` and use fakeredis (no real Redis). Tests build the schema from the models via `Base.metadata.create_all` (they do NOT run migrations), so a model column change is picked up by tests automatically; the Alembic migration is for real-DB upgrades.
- Frontend commands run from `frontend/` (`npm test`). Every new i18n key MUST be added to BOTH the `vn` and `en` blocks of `frontend/src/i18n/dictionary.ts`. Do not remove existing keys.
- Username rules: regex `^[A-Za-z0-9_.]+$`, length 3–30, then **lowercased** for storage + uniqueness. Login: if `identifier` contains `@`, match `email` exactly (unchanged email behavior); else match `username` against `identifier.lower()`. Preserve the existing constant-time dummy-hash guard on the not-found path.
- Brand: replace every user-visible "myEnglish" with "Snoopify". The app title (`layout.tsx`) and persist key (`snoopify_v1`) are already "Snoopify" — do not touch them.
- If Postgres is unavailable in the execution environment, backend tests cannot run; report that as a concern with the exact command rather than marking the task silently done.

---

### Task 1: Backend username support (model, migration, schemas, auth logic, tests)

This is one cohesive task because adding a `NOT NULL` `username` column while leaving register/tests unaware would break the suite mid-task. Everything that keeps the backend green moves together.

**Files:**
- Modify: `backend/app/db/models.py` (add `username` column)
- Create: `backend/migrations/versions/<generated>_add_username.py` (via `alembic revision`)
- Modify: `backend/app/schemas/auth.py` (RegisterRequest/LoginRequest/UserOut)
- Modify: `backend/app/api/routers/auth.py` (register dedupe, login by identifier)
- Modify: `backend/tests/conftest.py`, `backend/tests/api/test_auth.py`, `backend/tests/api/test_isolation.py`, `backend/tests/api/test_seed.py`, `backend/tests/api/test_models.py`

**Interfaces:**
- Produces: `User.username` (str, unique, lowercased); `RegisterRequest{email,username,password,display_name}`; `LoginRequest{identifier,password}`; `UserOut{id,email,username,display_name}`. Register returns 409 detail `"Email already registered"` or `"Username already taken"`. These exact shapes are consumed by Task 3 (frontend).

- [ ] **Step 1: Add failing/updated tests**

In `backend/tests/api/test_auth.py`, replace the file body with (keeps existing cases, updates payloads, adds username cases):

```python
import pytest

REG = {"email": "a@example.com", "username": "alpha", "password": "s3cret!", "display_name": "A"}

@pytest.mark.asyncio
async def test_register_sets_cookie_and_me_returns_user(auth_client):
    client, user = auth_client
    assert user["email"] == "a@example.com"
    assert user["username"] == "user_a"
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
    dup_email = {**REG, "username": "alpha2"}
    assert (await client.post("/auth/register", json=dup_email)).status_code == 409

@pytest.mark.asyncio
async def test_duplicate_username_is_409(client):
    assert (await client.post("/auth/register", json=REG)).status_code == 201
    dup_user = {**REG, "email": "other@example.com"}
    res = await client.post("/auth/register", json=dup_user)
    assert res.status_code == 409
    assert "username" in res.json()["detail"].lower()

@pytest.mark.asyncio
async def test_username_is_lowercased(client):
    res = await client.post("/auth/register", json={**REG, "username": "MixedCase"})
    assert res.status_code == 201
    assert res.json()["username"] == "mixedcase"

@pytest.mark.asyncio
async def test_login_by_username(client):
    await client.post("/auth/register", json=REG)
    res = await client.post("/auth/login", json={"identifier": "alpha", "password": REG["password"]})
    assert res.status_code == 200
    assert res.json()["email"] == "a@example.com"

@pytest.mark.asyncio
async def test_login_by_email_still_works(client):
    await client.post("/auth/register", json=REG)
    res = await client.post("/auth/login", json={"identifier": REG["email"], "password": REG["password"]})
    assert res.status_code == 200

@pytest.mark.asyncio
async def test_login_wrong_password_is_401(client):
    await client.post("/auth/register", json=REG)
    res = await client.post("/auth/login", json={"identifier": REG["email"], "password": "wrong"})
    assert res.status_code == 401

@pytest.mark.asyncio
async def test_logout_clears_session(auth_client):
    client, _ = auth_client
    assert (await client.post("/auth/logout")).status_code == 204
    assert (await client.get("/auth/me")).status_code == 401

@pytest.mark.asyncio
async def test_login_unknown_identifier_is_401(client):
    res = await client.post("/auth/login", json={"identifier": "nobody@example.com", "password": "whatever"})
    assert res.status_code == 401
```

In `backend/tests/conftest.py`, update the `auth_client` fixture payload (line ~83) to include a username:

```python
    payload = {"email": "a@example.com", "username": "user_a", "password": "s3cret!", "display_name": "A"}
```

In `backend/tests/api/test_isolation.py`, add usernames to the A/B payloads (lines 3-4):

```python
A = {"email": "a@example.com", "username": "iso_a", "password": "pw1234", "display_name": "A"}
B = {"email": "b@example.com", "username": "iso_b", "password": "pw1234", "display_name": "B"}
```

In `backend/tests/api/test_seed.py` (line ~14) and `backend/tests/api/test_models.py` (line ~8), add `username=` to the `User(...)` constructions:

```python
# test_seed.py
    user = User(email="seed@example.com", username="seeduser", password_hash="x", display_name="Seed")
```
```python
# test_models.py
    user = User(email="roundtrip@example.com", username="rounduser", password_hash="x", display_name="R")
```

- [ ] **Step 2: Run tests to verify they fail**

Run (from `backend/`): `uv run pytest tests/api/test_auth.py -q`
Expected: FAIL — `RegisterRequest` rejects/ignores `username`, `User` has no `username`, login uses `identifier` not yet supported (errors like `TypeError`/`KeyError`/422/`AttributeError`). If Postgres is unreachable, STOP and report the connection error + the command.

- [ ] **Step 3: Add the `username` column to the model**

In `backend/app/db/models.py`, in `class User`, add `username` right after the `email` column:

```python
    email: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    username: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
```

- [ ] **Step 4: Update the schemas**

Replace `backend/app/schemas/auth.py` with:

```python
import uuid

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=30, pattern=r"^[A-Za-z0-9_.]+$")
    password: str = Field(min_length=6, max_length=128)
    display_name: str = ""

    @field_validator("username")
    @classmethod
    def _normalize_username(cls, v: str) -> str:
        return v.lower()


class LoginRequest(BaseModel):
    identifier: str
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    email: str
    username: str
    display_name: str
```

- [ ] **Step 5: Update the auth router**

In `backend/app/api/routers/auth.py`, change `register` to dedupe username and persist it, and `login` to resolve an identifier. Replace the `register` and `login` function bodies:

```python
@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, response: Response, session: SessionDep, redis: RedisDep):
    email_taken = (await session.execute(select(User).where(User.email == data.email))).scalar_one_or_none()
    if email_taken is not None:
        raise HTTPException(status_code=409, detail="Email already registered")
    username_taken = (await session.execute(select(User).where(User.username == data.username))).scalar_one_or_none()
    if username_taken is not None:
        raise HTTPException(status_code=409, detail="Username already taken")
    user = User(
        email=data.email,
        username=data.username,
        password_hash=hash_password(data.password),
        display_name=data.display_name,
    )
    session.add(user)
    await session.flush()  # get user.id without committing
    await seed_starter_deck(session, user.id)
    await session.commit()  # single transaction: user + starter deck
    await session.refresh(user)
    sid = await create_session(redis, user.id)
    _set_cookie(response, sid)
    return user


@router.post("/login", response_model=UserOut)
async def login(data: LoginRequest, response: Response, session: SessionDep, redis: RedisDep):
    ident = data.identifier.strip()
    if "@" in ident:
        stmt = select(User).where(User.email == ident)
    else:
        stmt = select(User).where(User.username == ident.lower())
    user = (await session.execute(stmt)).scalar_one_or_none()
    if user is None:
        verify_password(data.password, _DUMMY_HASH)  # constant-time guard: prevent identifier-oracle timing
        raise HTTPException(status_code=401, detail="Invalid credentials")
    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    sid = await create_session(redis, user.id)
    _set_cookie(response, sid)
    return user
```

- [ ] **Step 6: Run tests to verify they pass**

Run (from `backend/`): `uv run pytest tests/api/test_auth.py tests/api/test_isolation.py tests/api/test_seed.py tests/api/test_models.py -q`
Expected: PASS. Then run the full backend suite: `uv run pytest -q` → all pass.

- [ ] **Step 7: Create the Alembic migration**

From `backend/`, generate an empty migration on top of the current head (`0bddbd794ada`):

Run: `uv run alembic revision -m "add username to users"`

This writes a new file under `backend/migrations/versions/` with an auto-generated revision id and `down_revision = '0bddbd794ada'`. Edit its `upgrade`/`downgrade` to:

```python
def upgrade() -> None:
    op.add_column("users", sa.Column("username", sa.String(), nullable=True))
    # Backfill existing rows from the email local-part, lowercased. Emails are
    # already unique; the few existing dev/seed rows have distinct, simple
    # local-parts, so this satisfies the unique index added below.
    op.execute("UPDATE users SET username = lower(split_part(email, '@', 1)) WHERE username IS NULL")
    op.alter_column("users", "username", nullable=False)
    op.create_index("ix_users_username", "users", ["username"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_username", "users")
    op.drop_column("users", "username")
```

Leave the auto-generated `revision`, `down_revision`, `branch_labels`, `depends_on`, and imports as alembic created them. Verify the chain: `uv run alembic heads` shows your new revision as the single head.

- [ ] **Step 8: Commit**

```bash
git add backend/app/db/models.py backend/app/schemas/auth.py backend/app/api/routers/auth.py backend/migrations/versions/ backend/tests/
git commit -m "feat(backend): username login (register requires it, login by email or username)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Frontend auth — username field + identifier login + error mapping

**Files:**
- Modify: `frontend/src/features/auth/AuthScreen.tsx`
- Modify: `frontend/src/i18n/dictionary.ts` (new keys, both `vn` + `en`)
- Modify: `frontend/src/features/auth/auth.test.tsx`

**Interfaces:**
- Consumes (from Task 1): register accepts `{email, username, password, display_name}` and returns 409 with detail containing "Username" or "Email"; login accepts `{identifier, password}`.

- [ ] **Step 1: Add i18n keys**

In `frontend/src/i18n/dictionary.ts`, add these keys to the `vn` block (near the existing auth keys like `nameL`/`emailL`):

```ts
    usernameL:'Tên đăng nhập', usernamePh:'nguyenvana', identifierL:'Email hoặc tên đăng nhập', identifierPh:'ban@email.com hoặc nguyenvana', authUsernameTaken:'Tên đăng nhập đã tồn tại',
```

and the matching keys to the `en` block:

```ts
    usernameL:'Username', usernamePh:'johndoe', identifierL:'Email or username', identifierPh:'you@email.com or johndoe', authUsernameTaken:'Username already taken',
```

- [ ] **Step 2: Update auth tests (write them to fail first)**

In `frontend/src/features/auth/auth.test.tsx`, follow the file's existing patterns (it mocks `apiPost` / `next/navigation`). Update register/login flows and add coverage. Add/adjust these cases (match the existing render + mock helpers in the file):

- Register submits `username` along with email/password/display_name: fill the username field (`getByLabelText('username')`) and assert the `apiPost` spy was called with `'/auth/register'` and an object containing `username`.
- Login submits `identifier`: fill the identifier field (`getByLabelText('identifier')`) and assert `apiPost` called with `'/auth/login'` and an object containing `identifier` (not `email`).
- A register 409 whose `ApiError.detail` contains "Username" shows `t.authUsernameTaken`; a 409 with "Email" shows `t.authEmailTaken`.

Run (from `frontend/`): `npm test -- src/features/auth/auth.test.tsx` → expect FAIL (fields/labels and payload keys not present yet).

- [ ] **Step 3: Implement the AuthScreen changes**

In `frontend/src/features/auth/AuthScreen.tsx`:

1. Add state: `const [username, setUsername] = useState('')` and `const [identifier, setIdentifier] = useState('')`. In `switchMode`, also reset both (`setUsername('')`, `setIdentifier('')`).
2. In `handleAuth`, change the two API calls:

```tsx
      if (isLogin) {
        await apiPost('/auth/login', { identifier, password: pw })
      } else {
        await apiPost('/auth/register', { email, username, password: pw, display_name: name })
      }
```

3. Update the 409 branch to distinguish username vs email:

```tsx
      if (err instanceof ApiError && err.status === 401) setError(t.authInvalidCreds)
      else if (err instanceof ApiError && err.status === 409)
        setError(typeof err.detail === 'string' && err.detail.toLowerCase().includes('username') ? t.authUsernameTaken : t.authEmailTaken)
      else setError(t.authConnError)
```

4. In the register-only block (the `{!isLogin && (...)}` that renders the name field), add a username field immediately after the name field, mirroring the existing field markup:

```tsx
                <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>{t.usernameL}</div>
                <input
                  required
                  aria-label="username"
                  className="field"
                  placeholder={t.usernamePh}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  style={{ width: '100%', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 13px', fontFamily: "'Hanken Grotesk', sans-serif", fontSize: 15, color: 'var(--ink)', background: 'var(--paper)', outline: 'none' }}
                />
```

(wrap it in its own `<div style={{ marginBottom: 14 }}>…</div>` like the name field).

5. Replace the existing Email field block so that in **login** mode it renders a single identifier field, and in **register** mode it stays the email field. Concretely: keep the email field inside the existing always-rendered block but make it conditional — in login mode render the identifier input (label `t.identifierL`, `aria-label="identifier"`, `type="text"`, value `identifier`, onChange `setIdentifier`); in register mode render the email input exactly as today (label `t.emailL`, `aria-label="email"`, `type="email"`, value `email`). Use `isLogin ? (identifier field) : (email field)`.

- [ ] **Step 4: Run tests to verify they pass**

Run (from `frontend/`): `npm test -- src/features/auth/auth.test.tsx` → PASS. Then `npm test` → full suite green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/auth/AuthScreen.tsx frontend/src/i18n/dictionary.ts frontend/src/features/auth/auth.test.tsx
git commit -m "feat(frontend): username on register, email-or-username login field

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Frontend brand rename → "Snoopify" on the auth screen

**Files:**
- Modify: `frontend/src/features/auth/AuthScreen.tsx` (brand block)
- Modify: `frontend/src/i18n/dictionary.ts` (two `obWelcome` strings)
- Modify: `frontend/src/features/auth/auth.test.tsx` (brand assertion)

**Interfaces:** none.

- [ ] **Step 1: Write the failing test**

In `frontend/src/features/auth/auth.test.tsx`, add a test asserting the auth screen shows the Snoopify brand and not "myEnglish":

```tsx
  it('shows the Snoopify brand, not myEnglish', () => {
    render(<AuthScreen />)
    expect(screen.getByText('Snoopify')).toBeInTheDocument()
    expect(screen.queryByText(/myEnglish/i)).not.toBeInTheDocument()
  })
```

(If the file lacks a bare `render(<AuthScreen />)` import/setup, reuse whatever render helper the file already defines.)

Run (from `frontend/`): `npm test -- src/features/auth/auth.test.tsx -t "Snoopify brand"` → FAIL (brand currently renders "my" + "English").

- [ ] **Step 2: Rename the brand block**

In `frontend/src/features/auth/AuthScreen.tsx`, replace the brand logo + wordmark (the `E` tile and the `my<span>English</span>` markup) with the Snoopify equivalent, matching the sidebar brand ("S" tile + plain "Snoopify"):

```tsx
          <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--accent)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Newsreader', serif", fontSize: 22, fontWeight: 600 }}>S</div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)' }}>Snoopify</div>
```

- [ ] **Step 3: Fix the onboarding strings**

In `frontend/src/i18n/dictionary.ts`, change the two `obWelcome` strings: `'Chào mừng đến với myEnglish'` → `'Chào mừng đến với Snoopify'` (vn) and `'Welcome to myEnglish'` → `'Welcome to Snoopify'` (en).

- [ ] **Step 4: Run tests to verify they pass**

Run (from `frontend/`): `npm test -- src/features/auth/auth.test.tsx` → PASS. Then `npm test` → full suite green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/auth/AuthScreen.tsx frontend/src/i18n/dictionary.ts frontend/src/features/auth/auth.test.tsx
git commit -m "fix(frontend): rename auth-screen brand to Snoopify

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Final verification

- [ ] Backend (from `backend/`, Postgres up): `uv run pytest -q` → all pass; `uv run alembic upgrade head` against a scratch DB applies cleanly.
- [ ] Frontend (from `frontend/`): `npm test` → all pass.
- [ ] Manual smoke (full stack via root `npm run dev`): register with a username → logged in; log out; log back in using the **username** in the single field; then log in again using the **email** — both work. Auth screen shows "Snoopify".

## Self-review (coverage vs spec §5.1, §5.2)

- §5.1 username login → Task 1 (backend: column, migration, schemas, register dedupe, identifier login, tests) + Task 2 (frontend: username field, identifier field, payloads, 409 mapping). ✓
- §5.2 brand rename → Task 3. ✓
- New i18n keys added to both vn + en. ✓
- Type consistency: `username`/`identifier`/`UserOut.username` names consistent across Task 1 (backend) and Task 2 (frontend payloads). ✓
