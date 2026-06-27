# Snoopify — FE Improvements Round (Spec A)

**Date:** 2026-06-27
**Status:** Approved (design)
**Scope:** Six frontend-focused changes. The Profile screen + its backend is
deliberately split into a separate follow-up (**Spec B**, see §9) because the
user chose to back the full profile (stats, editable goals, auto-computed
achievements, profile editing) with real backend work. Username login (this
spec) is a prerequisite for Spec B's "edit name/username".

## 1. Goal

Land a batch of FE fixes and small features on the Snoopify web app:

1. **Username login** — register requires a username; login accepts username **or** email in one field.
2. **Rename the auth-screen brand** from "myEnglish" to "Snoopify" (app already titled Snoopify).
3. **Fix the guided tour** breaking when the sidebar is collapsed.
4. **Fix the collapse/expand FAB** overlapping adjacent sidebar UI.
5. **Add a chatbot UI** (FAB + slide-in panel) per design v3, **input disabled** ("coming soon") — not functional.
6. **Library "+ New deck"** navigates to `/add` (per design); audit the Import-JSON modal against the design.
7. **"Mark as read"** actually clears the per-item dots and the bell badge.

Reference design: `.claude-design/myEnglish Dashboard v3.html` (a bundled
single-file mockup; the real HTML is a JSON-escaped string — the Profile and
AI-chat-panel sections are the relevant parts).

## 2. Suggested PR breakdown

| PR | Items | Risk |
|---|---|---|
| **PR1 — quick FE fixes** | §5.3 tour, §5.4 collapse FAB, §5.7 mark-as-read | Low, pure FE/CSS/store |
| **PR2 — auth** | §5.1 username login (FE + backend + migration + tests), §5.2 brand rename | Medium, touches backend + DB |
| **PR3 — UI** | §5.5 chatbot UI, §5.6 library new-deck + import audit | Low–medium, FE only |

PRs are independent and may land in any order. (Implementation-plan detail is
deferred to writing-plans; this split is guidance, not a hard requirement.)

## 3. Out of scope (Spec A)

- The Profile screen and any profile/goals/achievements backend → **Spec B**.
- The `window.prompt`-based **inline** "+ New deck" button inside
  `AddCardForm.tsx` (the deck picker's add button). Only the **Library header**
  "+ New deck" button changes in this spec. Confirmed with user.
- Real chat functionality / AI backend. The chatbot is UI-only.
- The non-functional "Import JSON" button on the Add screen
  (`AddScreen.tsx`) — it has no handler today and stays unwired.
- Renaming the internal `myenglish_tour_done` localStorage key (not
  user-visible; renaming would needlessly reset everyone's tour-done flag).

## 4. Affected files (inventory)

**Frontend**
- `features/auth/AuthScreen.tsx` — username field, identifier login, brand.
- `i18n/dictionary.ts` — new keys (username/identifier/auth errors, chatbot, coming-soon); fix two `obWelcome` "myEnglish" strings.
- `lib/api.ts` (no change expected) / auth payloads in `AuthScreen`.
- `store/useAppStore.ts` + `store/types.ts` — `chatOpen`, `notifRead` state + setters; persist `notifRead`.
- `components/layout/Topbar.tsx` — bell badge reads `notifRead`.
- `components/layout/NotificationsMenu.tsx` — dots read `notifRead`; "mark as read" sets it.
- `components/layout/Sidebar.tsx` + `app/globals.css` (+ mirror `src/index.css`) — collapse-FAB position.
- `store/useTourStore.ts` and/or `components/layout/Topbar.tsx` + `components/AppShell.tsx` — auto-expand sidebar around the tour.
- `components/AppShell.tsx` — render chat FAB + panel; new `ChatPanel` component under `components/layout/`.
- `features/library/LibraryScreen.tsx` + `features/library/DeckList.tsx` — "+ New deck" → `/add`.
- `features/library/ImportJsonModal.tsx` — design-conformance audit (likely minor).

**Backend**
- `app/db/models.py` — `User.username` column.
- `app/schemas/auth.py` — `RegisterRequest.username`, `LoginRequest.identifier`, `UserOut.username`.
- `app/api/routers/auth.py` — register uniqueness check, identifier-based login.
- `app/seed.py` — seed user gets a username.
- `migrations/versions/*` — new Alembic migration (add column, backfill, constrain).
- `tests/conftest.py`, `tests/api/test_auth.py`, `tests/api/test_isolation.py`, `tests/api/test_seed.py`, `tests/api/test_models.py` — register payloads gain `username`; add login-by-username + duplicate-username tests.

## 5. Design detail

### 5.1 Username login

**Backend**

- `User.username`: `Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)`. Stored **lowercased**.
- Validation (Pydantic `RegisterRequest`): accept mixed case — `Field(min_length=3, max_length=30, pattern=r"^[A-Za-z0-9_.]+$")` — then a field validator **lowercases** the value. Storage and the uniqueness check use the lowercased form, so `Minh` and `minh` collide. (Login mirrors this: the username path lowercases `identifier` before lookup.)
- `RegisterRequest`: add `username`. In `register()`, check both email **and** username uniqueness; return **409** with a distinct detail for each (`"Email already registered"` vs `"Username already taken"`) so the FE can show the right message.
- `LoginRequest`: rename `email: EmailStr` → `identifier: str`. In `login()`:
  - If `identifier` contains `"@"` → look up by `User.email == identifier` (unchanged email behavior).
  - Else → look up by `User.username == identifier.lower()`.
  - Keep the existing constant-time dummy-hash guard on the not-found path.
- `UserOut`: add `username: str`.
- **Migration (Alembic):**
  1. Add `username` column as `nullable=True`.
  2. Backfill: for each existing row, derive a candidate from the email local-part (`split('@')[0]`, lowercased, stripped to `[a-z0-9_.]`); on collision append a numeric suffix. (In practice only the seed/test users exist.)
  3. Alter column to `nullable=False`; add unique index.
- `seed.py`: give the seeded user an explicit `username` (e.g. `"seed"`).
- **Tests:** update every register payload to include a `username`; update the conftest fixture; add a login-by-username success test and a duplicate-username 409 test. Login tests currently posting `{"email", "password"}` must post `{"identifier", "password"}`.

**Frontend (`AuthScreen.tsx`)**

- State: add `username`. Register form gains a "Username" field (placed after "Your name", before "Email"), `required`, `aria-label="username"`.
- Register submit → `apiPost('/auth/register', { email, password: pw, display_name: name, username })`.
- Login form: replace the Email field with a single **identifier** field labeled "Email or username" (`aria-label="identifier"`, `type="text"`, not `type="email"`).
- Login submit → `apiPost('/auth/login', { identifier, password: pw })`.
- Error handling: keep 401 → invalid creds; on register, map 409 to either `authEmailTaken` or `authUsernameTaken` based on the error detail string.
- `switchMode` resets `username` too.

**i18n keys (new):** `usernameL` ("Tên đăng nhập" / "Username"), `usernamePh`, `identifierL` ("Email hoặc tên đăng nhập" / "Email or username"), `identifierPh`, `authUsernameTaken`, `authUsernameInvalid` (client-side format hint, optional).

### 5.2 Brand rename → "Snoopify" (auth screen)

- `AuthScreen.tsx` brand block (lines ~55–58): replace the "E" logo glyph with "S" and the `my<span>English</span>` markup with plain `Snoopify`, matching the Sidebar brand exactly.
- `dictionary.ts`: change the two `obWelcome` strings ("…myEnglish" → "…Snoopify"), VN and EN.
- No change to `layout.tsx` (`metadata.title` already `"Snoopify"`) or the `snoopify_v1` persist key.

### 5.3 Guided tour fix when sidebar collapsed

- **Root cause:** `tourSels` includes sidebar anchors `nav`, `add`, `decks`. When collapsed, `.side-decks` is `display:none`, so `document.querySelector('[data-tour="decks"]')` resolves an element whose `getBoundingClientRect()` is all-zero → the ring renders as a 1px artifact at (0,0).
- **Approach A (chosen):** ensure the sidebar is **expanded for the duration of the tour**.
  - On tour start (both the manual `Topbar.handleGuide` path and the auto-start `useEffect` in `AppShell`), if `useAppStore.getState().collapsed`, remember it and set `collapsed=false`.
  - On `endTour` (Done/Skip/finish), restore the remembered prior state.
  - Cross-store access: `useAppStore` and `useTourStore` are separate Zustand stores; read/write via `useAppStore.getState()` / `.setState()` from the tour trigger + end points. Keep the "remembered prior collapsed" flag wherever the tour is orchestrated (simplest: a module-level ref in the tour store, or a field on the tour store state).
- **Rejected B:** re-anchoring/skipping sidebar steps when collapsed — more moving parts, easy to misalign.

### 5.4 Collapse/expand FAB overlap

- `.collapse-fab` is `position:absolute; top:60px; right:-13px` on `Sidebar.tsx`. It overlaps adjacent UI. Reposition so it sits cleanly on the sidebar's right border and never overlaps the brand row, the first nav item, or main content — in **both** expanded (248px) and collapsed (78px) states, light + dark.
- This is a visual/positioning fix; the exact final offsets are determined by **visual verification** during implementation (run the app, toggle collapse, check both themes). Keep `zIndex` and the 28px circular hit-area intact.

### 5.5 Chatbot UI (disabled)

- **Store:** add `chatOpen: boolean` (default false) + `toggleChat`/`setPanel('chatOpen', …)` to `useAppStore` / `types.ts`. Not persisted.
- **New component** `components/layout/ChatPanel.tsx`, rendered by `AppShell`:
  - **FAB** (`position:fixed; right:24; bottom:24`) shown when `!chatOpen`, accent circle with the chat icon (design line ~1197).
  - **Panel** as a **fixed overlay** on all viewport sizes (deliberate simplification vs the design's desktop inline-aside, to avoid reflowing the main grid): `position:fixed; top:0; right:0; height:100vh; width:368px`, slide/translate transition, border-left, surface background, high `zIndex`.
  - **Header:** accent icon tile + `t.aiTitle` / `t.aiSub` + a close button (`toggleChat`).
  - **Messages:** a scroll area showing a single seeded AI greeting bubble (`t.aiGreeting`). No message state/list needed beyond the static greeting.
  - **Input row:** a text input + send button, both **`disabled`**, with a "coming soon" hint (`t.aiComingSoon`) shown in/near the input (e.g. placeholder or a small note). No send handler.
- **i18n keys (new):** `aiTitle`, `aiSub`, `aiPh`, `aiGreeting`, `aiComingSoon` (VN + EN; reuse the design's strings).
- Accessibility: FAB `aria-label`, panel close `aria-label`, input stays focusable-but-disabled.

### 5.6 Library "+ New deck" + Import-JSON audit

- **"+ New deck":** in `LibraryScreen.tsx`, replace `onNewDeck` (currently `window.prompt` + `apiPost('/decks')` + refresh) with `() => router.push('/add')`. The empty-state add action in `DeckList.tsx` (which calls the same `onNewDeck`) therefore also routes to `/add`. Remove the now-unused prompt/alert path and the `t.newDeckPrompt`/`t.newDeckFailed` usages **in this screen** (keep the dictionary keys — `AddCardForm` still uses them for its in-scope-excluded inline button).
- **Import-JSON audit:** diff `ImportJsonModal.tsx` against design lines ~1124–1148. It is already very close (title, instructions, sample `<pre>`, copy button, file picker, paste textarea, Import CTA, status). Action: confirm strings/styles match; adjust only genuine divergences. No behavioral change to the `/api/decks/import` flow.

### 5.7 Mark-as-read updates notifications

- **Store:** add `notifRead: boolean` (default false) to `useAppStore` / `types.ts`; **persist** it (add to `PERSIST_KEYS`) so "read" sticks across reloads (the notifications are static mock data, so this is acceptable and matches user intent).
- **`NotificationsMenu.tsx`:** the per-item colored dot renders only when `!notifRead`. The "Mark as read" click sets `notifRead=true` (instead of closing the panel) — panel stays open so the user sees the dots disappear.
- **`Topbar.tsx`:** the hardcoded red bell badge `<span>` renders only when `!notifRead`.
- The notifications themselves remain static (`t.n1..t.n3`); only their read state becomes dynamic.

## 6. Testing

- **Backend:** update existing auth/isolation/seed/model tests for the new `username` field and the `identifier` login payload. Add: register-with-duplicate-username → 409; login-by-username success; login-by-email still works; migration smoke (column exists, not null, unique).
- **Frontend (Vitest/RTL):**
  - `auth.test.tsx`: register sends `username`; login sends `identifier`; 409-username shows `authUsernameTaken`.
  - Brand: auth screen shows "Snoopify", not "myEnglish".
  - `NotificationsMenu` / Topbar: after "mark as read", dots + bell badge are gone (assert on `notifRead` effect).
  - Library: "+ New deck" triggers navigation to `/add` (mock `useRouter().push`).
  - Chat: FAB toggles panel; input is `disabled`.
  - Tour: starting the tour expands a collapsed sidebar; ending restores prior collapsed state.
- Run frontend tests with the project runner; backend tests with `uv run python -m pytest` against `snoopify_test` (fakeredis in tests).

## 7. i18n summary (new keys, VN + EN)

`usernameL`, `usernamePh`, `identifierL`, `identifierPh`, `authUsernameTaken`,
`authUsernameInvalid`, `aiTitle`, `aiSub`, `aiPh`, `aiGreeting`, `aiComingSoon`.
Plus edits to existing `obWelcome` (VN+EN). Every new key must exist in **both**
language blocks (the dictionary is keyed by `vn`/`en`).

## 8. Risks / notes

- Making `username` `NOT NULL UNIQUE` is the only schema-breaking change; the
  migration's backfill must run before the not-null constraint. Only seed/test
  users exist today, so collision risk is negligible.
- Renaming `LoginRequest.email` → `identifier` is a breaking API contract change
  for the login endpoint; FE and tests are updated in the same PR (PR2) so they
  stay in lockstep. No other client consumes `/auth/login`.
- Chatbot overlay uses a high `zIndex`; verify it does not sit above the
  notifications menu / settings popup / import modal in a confusing way (it is
  fine for it to overlay content; just check stacking is intentional).

## 9. Spec B (deferred — separate brainstorm)

Profile screen per design v3 + full backend:

- **Stats** (cards learned, mastered, streak, accuracy) computed from review data.
- **Learning goal** (main goal, daily target, level e.g. B1→B2) stored in backend, editable via "Edit profile".
- **Achievements** (6 badges) earned/locked computed from milestones (7/30-day streak, 100/500 cards mastered, 10 sessions, level B2).
- **Profile editing** (display_name + username) endpoint.
- Sidebar settings popup + user footer gain a "Profile" entry routing to the profile screen (design lines ~356–396).

Depends on §5.1 (username). Will be brainstormed as its own spec → plan →
implementation cycle.
