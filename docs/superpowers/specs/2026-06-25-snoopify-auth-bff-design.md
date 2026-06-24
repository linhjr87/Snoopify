# Snoopify — Real Authentication (Redis sessions) + Per-User Data (SP-B)

**Date:** 2026-06-25
**Status:** Approved (design)
**Depends on:** SP-A (Next replatform finish, merged) + the SP-A polish PR #8
(hydration/grade/write-UX). SP-B branches from `main` **after** PR #8 merges and
rewrites the auth surface from there.
**Sibling (prior):** `2026-06-25-snoopify-next-replatform-finish-design.md`.
**Language note:** written in English to match the sibling specs; Vietnamese
appears only in UI copy.

## 1. Goal

Replace the fake client-only auth seam SP-A left (a Zustand `isAuthenticated`
flag) with **real authentication** and **per-user data isolation**. After SP-B,
a user registers/logs in with email + password, the backend issues a
**Redis-backed server session** (opaque id in an httpOnly cookie), and every
deck/card/review/progress read and write is scoped to the authenticated user —
user A can never see or mutate user B's data. A new user is seeded their own
starter deck on registration.

## 2. Decisions (constraints)

| Aspect | Decision |
|---|---|
| Auth methods | **Email + password only.** The fake Google button is removed. No OAuth, no email verification, no password reset (future work). |
| Session | **Server-side sessions in Redis.** Opaque `session_id` (`secrets.token_urlsafe(32)`) in an httpOnly cookie `sid`; Redis `session:{id} → {user_id}` with TTL. Revocable (logout/expiry deletes the key). |
| Password hashing | **bcrypt via passlib** (`passlib[bcrypt]`). |
| BFF pattern | **Thin BFF (Approach A).** Login/register/logout forms POST to `/api/auth/*` (the existing Next `/api` rewrite → backend). Backend sets/clears the `sid` cookie via `Set-Cookie` (passes through the same-origin rewrite, scoped to the `:3000` origin). |
| Route protection | **Next `middleware.ts`**, presence check only: a protected path with no `sid` cookie → redirect `/login`; `/login` with a `sid` cookie → redirect `/`. The real gate is the backend validating the session on every request. |
| Server reads | Server `apiFetch` forwards the `sid` cookie (read via `next/headers` `cookies()`) to the backend (server calls hit `BACKEND_URL` directly, bypassing the proxy, so the cookie must be forwarded manually). A backend `401` → redirect `/login`. |
| Client writes | Continue through the `/api` proxy; the same-origin cookie is sent automatically. |
| Data scoping | Add `user_id` FK to **`decks`** only. `cards → deck` and `review_logs → card` cascade, so scoping decks transitively scopes everything; non-deck queries filter via a join to `decks`. |
| Existing data | The Alembic migration **deletes existing dev decks/cards/reviews** (intended — they are unowned dev seed data) and adds `user_id NOT NULL`. The global startup seed is disabled; each new user is seeded a starter deck on registration. |
| Infra | Add a **`redis`** service to docker-compose; backend `depends_on` it. New backend deps: `redis>=5`, `passlib[bcrypt]`. `cors_origins` → `http://localhost:3000`. |
| Frontend auth state | Remove the Zustand `isAuthenticated`/`login`/`logout` fields and the `_hasHydrated` client guard. Auth state is server-derived; `display_name`/greeting come from `GET /auth/me`. |
| Backend | Existing routers gain a `CurrentUserDep` and user-scoped queries; a new auth router/service/`User` model + Redis session store are added. |

## 3. Tech stack additions

- **Backend:** `redis` (asyncio client), `passlib[bcrypt]`. New `app/redis.py`
  (client + session store), `app/api/routers/auth.py`, `app/services/auth.py`,
  `app/schemas/auth.py`, `app/models` `User`. Alembic revision.
- **Frontend:** `frontend/src/middleware.ts`; `apiFetch` cookie forwarding;
  rewritten `AuthScreen`; logout wiring. No new npm deps.

## 4. Backend design

### 4.1 User model + migration

```
class User(Base):  # users
  id: UUID pk
  email: str unique, indexed, not null
  password_hash: str not null
  display_name: str not null default ""
  created_at, updated_at
```

`Deck` gains `user_id: UUID = ForeignKey("users.id", ondelete="CASCADE"),
nullable=False, index=True` + `relationship`.

**Alembic revision** (single migration):
1. `create table users`.
2. **Delete** existing `decks` (cascade removes `cards` → `review_logs`) — dev
   seed data, intentionally dropped.
3. `add column decks.user_id` as `NOT NULL` FK → `users.id` (`ondelete CASCADE`),
   indexed.

### 4.2 Sessions (Redis)

`app/redis.py`: an async Redis client from `settings.redis_url`, and a session
store:
- `create_session(user_id) -> session_id`: `sid = token_urlsafe(32)`; `SET
  session:{sid} {user_id} EX {session_ttl_seconds}`; return `sid`.
- `get_session_user_id(sid) -> uuid | None`: `GET session:{sid}`.
- `delete_session(sid)`: `DEL session:{sid}`.

Cookie: name `sid`, `httponly=True`, `samesite="lax"`, `secure=settings.cookie_secure`
(false in dev, true in prod), `path="/"`, `max_age=session_ttl_seconds`.

### 4.3 Auth dependency

`get_current_user(session: SessionDep, sid: str | None = Cookie(None)) -> User`:
read `sid` cookie → `get_session_user_id` → load `User` by id → return it; any
missing step raises `401`. Exposed as `CurrentUserDep = Annotated[User,
Depends(get_current_user)]`.

### 4.4 Auth endpoints (`app/api/routers/auth.py`, prefix `/auth`)

- `POST /auth/register` `{email, password, display_name}` → 409 if email exists;
  else create user (bcrypt hash), `seed_starter_deck(session, user.id)`, create
  session, set `sid` cookie, return `{id, email, display_name}` (201).
- `POST /auth/login` `{email, password}` → verify; 401 on bad creds; else create
  session, set cookie, return the user.
- `POST /auth/logout` → delete session, clear cookie, 204.
- `GET /auth/me` → the current user (via `get_current_user`); 401 if no session.

### 4.5 Per-user seeding

Extract the current `app/seed.py` starter-deck definition into
`seed_starter_deck(session, user_id)`; call it from `/auth/register`. Disable the
global `seed_on_startup` path.

### 4.6 Data scoping (every existing router)

Each existing router adds `CurrentUserDep` and passes `user.id` into its service;
services scope queries:
- **decks**: `WHERE Deck.user_id == user.id`; create sets `user_id`; get/update/
  delete/import verify ownership (404 if the deck isn't the user's).
- **cards** (`/decks/{deck_id}/cards`, `/cards/...`): verify the parent deck
  belongs to the user; standalone card queries join `cards → decks` and filter
  `decks.user_id`.
- **review** (`/review/session`, `/review/grade`): assemble/grade only the user's
  cards (join through deck); grading a card not owned by the user → 404.
- **progress** (`summary/heatmap/needs-review/reset` + `dashboard/word-of-day`,
  `cards/recent`): all aggregates filter to the user's cards/reviews via the deck
  join; `reset` only resets the user's data.

**Security test (required):** user A's token cannot read or mutate user B's
deck/card/review/progress — for every router.

## 5. Frontend design (thin BFF)

### 5.1 `middleware.ts`

Match all app routes except static assets and `/api/*`. If the path is `/login`
and `sid` cookie present → redirect `/`. If the path is not `/login` and `sid`
absent → redirect `/login`. (Presence-only; the backend is the real gate.)

### 5.2 AuthScreen (rewrite)

Remove the Google button. **Login**: email + password → `POST /api/auth/login`.
**Signup**: display name + email + password + confirm → `POST /api/auth/register`.
On success the cookie is set by the backend response; `router.push('/')` +
`router.refresh()`. Map errors to Vietnamese: 401 → "Email hoặc mật khẩu không
đúng"; 409 → "Email đã được đăng ký"; network → existing connection error copy.

### 5.3 `apiFetch` cookie forwarding

Server `apiFetch` reads the `sid` cookie via `next/headers` `cookies()` and sends
`Cookie: sid=<value>` to the backend. On `401` it throws (existing `ApiError`);
the calling server page treats a 401 as an expired session and calls
`redirect('/login')` from `next/navigation`. (Middleware already gates the
no-cookie case; a 401 here means the session expired mid-use in Redis.) Client
writes are unchanged (cookie auto-sent through the proxy).

### 5.4 Remove the fake-auth seam

Delete the Zustand `isAuthenticated`/`login`/`logout` fields, the `_hasHydrated`
gate, and the AppShell client guard (superseded by `middleware.ts`). The
SP-A-polish hydration gate is removed here; its grade test and write-UX changes
stay. Logout (Topbar/SettingsPanel button) → `POST /api/auth/logout` →
`router.push('/login')`. Greeting/display name come from `GET /auth/me`
(server-side, e.g. in the dashboard page or a small server component).

## 6. Testing

- **Backend:** password hash/verify; session store against **fakeredis**;
  register (incl. 409 + starter-deck seeded), login (incl. 401), logout, `/me`
  (incl. 401); **cross-user isolation** (A cannot touch B) on every router;
  per-user seed on register. httpx `AsyncClient` + test DB + fakeredis.
- **Frontend:** AuthScreen login/register success + 401/409 error rendering;
  `middleware` redirect logic (both directions); `apiFetch` forwards the `sid`
  cookie and redirects on 401; logout posts + routes to `/login`. Remove the
  fake-auth tests.

## 7. Implementation phases (one plan)

1. **Backend auth core:** `User` model + migration, Redis session store,
   `get_current_user`, `/auth/*` endpoints, password hashing. (No scoping yet.)
2. **Backend data scoping:** `user_id` on decks, scope every router/service,
   per-user starter seed, disable global seed; cross-user isolation tests.
3. **Frontend BFF:** rewrite AuthScreen, `middleware.ts`, `apiFetch` cookie
   forwarding, remove the fake-auth seam + client guard, logout.
4. **Infra + verify:** docker-compose `redis` service, config/env, `cors_origins`
   → 3000; end-to-end verification (register → login → scoped data → logout) and
   cleanup of dead fake-auth tests.

## 8. Out of scope

- OAuth/Google, email verification, password reset, "remember me"/refresh tokens,
  multi-device session management UI, rate limiting (a basic measure may be added
  but no dedicated system), account settings/profile editing.

## 9. Done criteria

1. Register + login set an httpOnly `sid` cookie backed by a Redis session;
   logout deletes it; `/me` returns the user.
2. Unauthenticated access to any protected route redirects to `/login`
   (middleware); authenticated access to `/login` redirects to `/`.
3. Every deck/card/review/progress read and write is user-scoped; the cross-user
   isolation tests pass for all routers.
4. A new user is seeded their own starter deck on registration; no global seed.
5. The fake Zustand auth seam and client guard are gone; auth state is
   server-derived.
6. Full backend + frontend suites green; `redis` runs in docker-compose; a clean
   `docker compose up` supports the end-to-end flow.
