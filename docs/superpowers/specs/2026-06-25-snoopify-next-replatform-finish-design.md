# Snoopify — Finish the Next.js Replatform (SP-A)

**Date:** 2026-06-25
**Status:** Approved (design)
**Depends on:** Increment 1 of the replatform (PR #6) — Dashboard already runs on
Next; this finishes the remaining four screens, the guided tour, and the Vite
cleanup.
**Parent spec:** `2026-06-23-snoopify-next-replatform-design.md` (this realizes
the rest of that spec's "feature parity for the five screens" goal).
**Sibling (later):** SP-B — real auth (BFF cookie) + per-user data scoping. SP-B
is a **separate spec** and is out of scope here.
**Language note:** written in English to match the sibling specs; Vietnamese
appears only in UI copy.

## 1. Goal

Bring the Snoopify frontend to **full feature parity on Next.js (App Router,
server-first)** by porting the four screens still served by the dormant Vite SPA
— **Library, Review, Add, Progress** — plus wiring the **guided tour**, then
**removing the Vite / react-router / TanStack Query** stack entirely. The backend
is **unchanged**.

After this work, every sidebar route resolves on Next (no 404s), no code imports
`@tanstack/react-query`, `react-router-dom`, or `vite`, and the test suite is
green against the Next pattern.

## 2. Context (current state)

- **Done (PR #6):** `app/layout.tsx`, `app/page.tsx` (Dashboard), `AppShell`,
  `Providers`, server `apiFetch`, `next.config.ts` rewrites (`/api/:path* →
  ${BACKEND_URL}/:path*`, strips `/api`), `output: 'standalone'`.
- **Not ported (return 404 on Next):** `/library`, `/review`, `/add`,
  `/progress`, `/login`. Their components still live under `features/*` and use
  `useQuery`/`useMutation` + `react-router-dom`.
- **Backend has no auth** — routers are health, decks, cards, progress, review,
  dashboard only. The current "auth" is a client-only fake: `login()` sets
  `isAuthenticated: true` in the Zustand `persist` store (localStorage). Making
  auth real is **SP-B**.
- **Tour:** `GuidedTourOverlay` exists but is **not** mounted in `AppShell`
  (AppShell renders only Sidebar + Topbar + children).

## 3. The pattern (mirror Dashboard — do not invent a new one)

Every ported screen follows the exact shape already proven by the Dashboard:

- **`<screen>/page.tsx` (server component):** read all data the screen needs via
  `apiFetch<T>(path)` (calls `BACKEND_URL` directly, no `/api` prefix), combining
  reads with `Promise.all`. Tolerate a failed read with `.catch(() => fallback)`
  the way `app/page.tsx` does, so one bad endpoint does not blank the screen.
  Pass results as **props** into the client component(s).
- **Client island (`'use client'`):** receives data as props, keeps **UI-only**
  state in React/Zustand (filter text, group-by, review mode, cursor), and
  performs writes with `fetch('/api/<path>', { method, body })` followed by
  `router.refresh()` (from `next/navigation`) to re-run the server fetch.
- **No** `useQuery`, `useMutation`, `QueryClientProvider`, or `queryClient`
  anywhere in the result.

## 4. Per-screen server/client split

### 4.1 Library — `app/library/page.tsx`

- **Server reads:** `/decks`.
- **Props → client `LibraryScreen`:** `decks: DeckOut[]`.
- **Client UI state:** `filterText`, `group` (group-by). Sorting/filtering stays
  the in-memory logic already in `LibraryScreen` (`toDeckCard`, `deck-view.ts`).
- **Mutations:**
  - New deck: `POST /api/decks` `{ name }` → `router.refresh()`.
  - Import JSON (`ImportJsonModal`): `POST /api/decks/import`; the endpoint
    returns `{ok,msg,deck?}` on **both** 200 and 400, so read the JSON body on
    any status (do not throw on non-OK) — preserve today's behavior. On
    `result.ok`, `router.refresh()`.

### 4.2 Review — `app/review/page.tsx`

- **Server reads:** `/review/session` (default no `deck_id`, `limit=20`), mapped
  through `toSessionItem` into `SessionCard[]`.
- **Props → client `ReviewScreen`:** `session: SessionCard[]`.
- **Client UI state (Zustand, unchanged):** `reviewMode`, `sIndex`, `sCorrect`,
  `gradeError`. Keep the existing **session-key reset** effect: when a session
  with different card content loads, reset the cursor so a stale `sIndex` cannot
  point into the wrong card set.
- **Mutations:** grade in Flashcard/Quiz/Fill → `POST /api/review/grade`. The
  cursor keeps advancing optimistically; on failure set `gradeError` (the
  existing non-blocking warning). Do **not** refresh mid-session (that would
  refetch and reset the cursor).
- **New session / "Ôn lại"** (today handled by `SessionComplete` invalidating the
  query): replace with `router.refresh()` to refetch `/review/session`.
- **Navigation:** `useNavigate('/')` → `useRouter().push('/')`.

### 4.3 Add — `app/add/page.tsx`

- **Server reads:** `/decks` (for the deck picker).
- **Props → client `AddCardForm`:** `decks: DeckOut[]`.
- **Mutations:**
  - Create deck inline: `POST /api/decks`.
  - Add card: `POST /api/decks/{deckId}/cards`.
  - After a successful add, `router.refresh()` (and keep the existing inline
    preview / reset-form behavior).

### 4.4 Progress — `app/progress/page.tsx`

- **Server reads (parallel):** `/progress/summary`, `/progress/heatmap`,
  `/progress/needs-review`.
- **Props:** today each child (`Calendar`, `ReviewBars`, `MasteryLevels`,
  `NeedsReview`) fetches independently via `useQuery`. Change them to receive
  their slice as **props** from `page.tsx` — one fetch per endpoint instead of
  per-component. `ProgressScreen` becomes a presentational client/server shell
  that distributes props.
- **Mutation:** reset progress (in `SettingsPanel`): `POST /api/progress/reset`
  → `router.refresh()`. Preserve the current "check `res.ok`, surface error on
  failure" behavior.

## 5. Guided tour

- Mount `GuidedTourOverlay` inside `AppShell` (client), after `<main>`.
- Move the auto-start logic out of the old `ProtectedLayout` into a client effect
  in `AppShell` (or a small dedicated client child): on mount, if
  `localStorage 'myenglish_tour_done' !== '1'`, `setTimeout(startTour, ~450ms)`.
  Guard `localStorage` access in `try/catch` (SSR/no-storage safety).

## 6. Auth-routing boundary (minimal wiring only)

Removing `react-router-dom` forces touching `AuthScreen` (it uses `useNavigate`).
SP-A does the **minimum** to wire the *existing fake* auth into Next routing;
SP-B replaces it with real BFF-cookie auth + a server-side guard.

- Create `app/login/page.tsx` rendering `AuthScreen`.
- `AuthScreen`: swap `useNavigate` → `useRouter` (`next/navigation`); keep calling
  the existing store `login()` (still fake) and `router.push('/')`.
- **Client guard** in `AppShell` (port of the old `ProtectedLayout`): read
  `isAuthenticated` from Zustand; if false, `router.replace('/login')` and render
  nothing (or a minimal placeholder) until redirect. The login route itself must
  render **without** the guard/shell chrome.
- Explicitly deferred to SP-B: real backend endpoints, password handling,
  httpOnly cookie, server-side/middleware guard, per-user data scoping. The fake
  `login()` and client guard are a **seam** SP-B upgrades, not throwaway work.

## 7. Cleanup — remove the Vite / RQ / router stack

After all screens are ported and green, remove (verifying no remaining imports
first):

- **Dependencies:** `@tanstack/react-query`, `react-router-dom`, `vite`,
  `@vitejs/plugin-react`.
- **Files:** `features/{library,review,add,progress,dashboard}/queries.ts` and
  their `queries.test.tsx`; `lib/queryClient.ts`; `src/routes.tsx`, `src/App.tsx`,
  `src/main.tsx`, `index.html`; `vite.config.ts`; `nginx.conf` (Next standalone
  replaces it). Also drop the old `test/renderWithProviders` helper if it wraps
  QueryClient/MemoryRouter.
- Keep `vitest.config.ts` and `@testing-library/*` (test runner stays).

## 8. Tests

Rewrite the four screen test files (`library`, `review`, `add`, `progress`) to
the Next pattern already used by `dashboard.test.tsx`:

- Drop `QueryClientProvider` and `MemoryRouter`.
- Mock `next/navigation` (`useRouter`, `usePathname`).
- Render the **client** component with data passed as **props**; assert on
  rendered output and on `fetch` being called with the expected `/api/...` URL +
  method for each mutation (mirroring the existing `apiFetch` URL assertions).
- `queries.test.tsx` files are deleted along with their `queries.ts`.

Keep the suite green per task. UI copy stays Vietnamese.

## 9. Out of scope

- Real authentication, password handling, cookies, per-user data scoping,
  backend changes — **all SP-B**.
- Any redesign of screen visuals or new features. This is parity + cleanup only.

## 10. Done criteria

1. `/library`, `/review`, `/add`, `/progress`, `/login` all return 200 and render
   on Next; sidebar navigation never 404s.
2. A client guard redirects unauthenticated users to `/login` (fake auth seam).
3. Guided tour auto-starts for first-time users and is reachable from the topbar.
4. `grep` finds **no** imports of `@tanstack/react-query`, `react-router-dom`, or
   `vite` in `src/`; those deps are gone from `package.json`.
5. The vitest suite passes against the Next pattern.
6. Each write path (new deck, import, grade, add card, reset progress) works
   end-to-end through `/api/*` and reflects after `router.refresh()`.
