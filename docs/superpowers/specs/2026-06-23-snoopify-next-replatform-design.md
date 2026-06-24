# Snoopify — Frontend Replatform to Next.js (kg stack)

**Date:** 2026-06-23
**Status:** Approved (design)
**Depends on:** the merged Vite SPA (PR #3) — this replaces its frontend.
**Reference model:** `kg_intelligence` (Next 15 App Router, server-first, BFF-ready).
**Language note:** written in English to match the sibling specs; Vietnamese
appears only in UI copy.

## 1. Goal

Replatform the **existing, merged Snoopify frontend** from a **Vite + React
SPA** (react-router + Zustand + TanStack Query) to **Next.js (App Router),
server-first**, on the `kg_intelligence` stack — at **feature parity** with the
current five screens. This is the foundation for two later specs that build on
the Next base: **auth** (kg-style BFF cookie) and **guide tour** (onboarding).
The **backend is unchanged**.

## 2. Decisions (constraints)

| Aspect | Decision |
|---|---|
| Framework | **Next.js 15 App Router** (replaces Vite). Full replatform, not hybrid. |
| Data model | **Server-first**: `page.tsx` server components fetch reads via `lib/api`; client components handle interactivity. |
| Client mutations | **Plain `fetch` + `router.refresh()`** (kg-style). **Remove TanStack Query** entirely. |
| Routing | **App Router** file routes (replaces `react-router-dom`). `useNavigate`→`next/navigation`; links via `next/link`. |
| Proxy | **Next `rewrites`**: `/api/:path* → ${BACKEND_URL}/:path*` — **strips `/api`** (backend serves at root). Replaces Vite proxy + nginx. |
| Serving | **Next `output: 'standalone'`** (Node server). Replaces nginx-served static. |
| UI | **Keep** existing inline-style components + Tailwind + theme tokens. **Do NOT** adopt kg's shadcn. |
| State | **Keep Zustand for UI-state only** (review UI, prefs, panels). No server data in the store. |
| Scope | **Replatform only** — parity for the 5 screens. **Auth and guide tour are separate later specs.** |
| Frontend port | **3000** (Next default, matches kg). |
| Theme (dark mode) | Apply on client mount in a `Providers` component **+ a blocking inline script** in `layout.tsx` to avoid the SSR flash. |
| Tests | **Rewrite for Next** (drop QueryClientProvider/MemoryRouter; mock `next/navigation`), as a dedicated phase of the implementation plan. Keep **vitest + @testing-library**. |
| Backend | **Unchanged.** |

## 3. Tech stack

- **Next.js 15** (App Router, React 18, `output: 'standalone'`), TypeScript.
- **Tailwind** + existing CSS theme tokens (ported). **Zustand** (UI-state).
- **Vitest + @testing-library** (reconfigured for Next).
- **Removed:** `vite`, `@vitejs/plugin-react`, `react-router-dom`,
  `@tanstack/react-query`.

## 4. Target structure

```
frontend/
  next.config.ts          # rewrites (strip /api) + output: 'standalone'
  tsconfig.json  postcss.config.js  tailwind.config.*  eslint (next)
  app/
    layout.tsx            # <html><body> + theme inline script + Providers + AppShell
    globals.css           # from index.css + theme token base
    page.tsx              # Dashboard  (server: summary + word-of-day + recent)
    library/page.tsx      # server: /decks
    review/page.tsx       # server: /review/session
    add/page.tsx          # server: /decks
    progress/page.tsx     # server: summary + heatmap + needs-review
  components/
    Providers.tsx (client)  # theme-init; any client context
    AppShell.tsx  (client)  # Sidebar + Topbar + SettingsPanel + menus
    layout/*  ui/*          # ported (client where interactive)
  features/<screen>/        # client screen components + interactive islands
  lib/  api.ts api-types.ts adapters.ts format.ts grading.ts
  store/  i18n/  theme/  data/seed.ts   # ported (Zustand UI-state only)
```

Removed: `main.tsx`, `index.html`, `routes.tsx`, `App.tsx` (shell → `layout.tsx`
+ `AppShell`), `vite.config.ts`, `lib/queryClient.ts`, every
`features/*/queries.ts`, `nginx.conf`, `test/renderWithProviders.tsx` (replaced).

## 5. Data layer

- **Reads (server):** `lib/api.ts` exports
  `apiFetch<T>(path): Promise<T>` = `fetch(`${process.env.BACKEND_URL ??
  'http://localhost:8000'}${path}`, { cache: 'no-store' })`, throwing a typed
  error on non-OK. Server `page.tsx` components call it directly (e.g.
  `apiFetch('/review/session')`) — no `/api` prefix (calling the backend
  directly). Parallel fetches via `Promise.all` (kg pattern).
- **Writes (client):** client components `fetch('/api/<path>', { method, body })`
  → Next rewrite strips `/api` → backend → then `router.refresh()` to re-run the
  server fetch (or a server action where cleaner). The non-standard
  `/decks/import` (`{ok,msg}` on any status) is read directly from the response,
  not thrown.
- **Per screen:**
  - **Dashboard** (`app/page.tsx`): server-fetch `/progress/summary`,
    `/dashboard/word-of-day` (404→placeholder), `/cards/recent`; client widgets
    receive props. QuickAdd = `next/link` to `/add`.
  - **Library** (`app/library/page.tsx`): server-fetch `/decks`; client filter/
    group + import modal (`POST /decks/import` + refresh) + new-deck (`POST
    /decks` + refresh).
  - **Review** (`app/review/page.tsx`): server-fetch `/review/session`
    **once**; client `ReviewScreen` holds the session in client state **for the
    whole session** (flip/quiz/fill/grade client; `POST /review/grade` per
    card). **No mid-session refresh**; revalidate progress at session end.
  - **Add** (`app/add/page.tsx`): server-fetch `/decks` (dropdown); client form
    `POST /decks/{id}/cards` (+ inline `POST /decks`) + refresh.
  - **Progress** (`app/progress/page.tsx`): server-fetch `/progress/summary`,
    `/progress/heatmap`, `/progress/needs-review`; client widgets via props.
  - **Settings reset** (client, in `AppShell`): `POST /progress/reset` +
    refresh.

## 6. State & theme

- **Zustand (client UI-state only):** `reviewMode, flipped, quizPick, fillValue,
  fillChecked, sIndex, sCorrect, gradeError, dark, lang, collapsed`, panels
  (`settingsOpen, confirmReset, importOpen, notifOpen, langMenuOpen`),
  `importText`. `persist` → `dark, lang, collapsed`.
- **Theme/dark mode (SSR-safe):** a small **blocking inline `<script>`** in
  `app/layout.tsx` reads the persisted preference and sets the theme class
  before paint (no flash); a client `Providers` component reconciles Zustand +
  `applyTheme` on mount (no hydration mismatch).
- **i18n:** `useT` (reads Zustand `lang`) is used inside client components.

## 7. Proxy · config · Docker · dev

- **`next.config.ts`:** `output: 'standalone'`; `rewrites()` →
  `{ source: '/api/:path*', destination: `${process.env.BACKEND_URL ??
  'http://localhost:8000'}/:path*` }` (strips `/api`).
- **`BACKEND_URL`:** build arg + runtime env (server-side: rewrites + server
  `apiFetch`). The browser only ever calls relative `/api/*`.
- **`frontend/Dockerfile`:** multi-stage Next standalone — `node:22-alpine`
  builder (`npm ci` + `next build`) → runner copies `.next/standalone` +
  `.next/static` + `public`, runs `node server.js` on `3000`. Replaces the
  nginx Dockerfile; **`nginx.conf` is deleted**.
- **Root `docker-compose.yml`:** `frontend` service builds Next,
  `BACKEND_URL=http://api:8000`, port `3000:3000`, `depends_on: api`. Dev path:
  `next dev` (3000) + `docker compose up db api`, orchestrated by the root
  `concurrently` script (FE command changes to `next dev`).

## 8. Testing strategy

- **Client components** become prop-driven → test by rendering with **fixture
  props** + **mock `next/navigation`** (`useRouter`/`usePathname`) + **mock
  `fetch`** for mutations. Most existing component tests port with these swaps.
- **`lib/apiFetch`** tested directly (mocked `fetch`).
- **Server `page.tsx`** components: extract any non-trivial shaping into testable
  `lib` functions; cover full pages with a light smoke/e2e (or defer e2e). Don't
  unit-test async server components through @testing-library.
- Keep **vitest + @testing-library**; reconfigure for Next (remove the
  Vite/react-query/MemoryRouter scaffolding; add a `next/navigation` mock and a
  new `renderWithProviders` that wraps only the theme/i18n client context).
- This is a **substantial test rewrite** and is its own phase in the plan.

## 9. Implementation phasing (for the plan)

The implementation plan should phase the replatform so each phase is testable:
1. **Scaffold Next** alongside (next.config, tsconfig, app/layout + a placeholder
   page, Tailwind/theme wired, dev script) — app boots on Next.
2. **Shell**: `AppShell` (Sidebar/Topbar/menus/SettingsPanel) + `Providers` +
   theme inline script; routing via App Router.
3. **Data layer**: server `lib/api.apiFetch`; remove react-query/queryClient.
4. **Port screens** one per phase (Dashboard → Library → Review → Add →
   Progress), each as server page + client islands + client mutations.
5. **Docker/orchestration**: Next standalone Dockerfile + compose + dev script;
   remove nginx.
6. **Test migration**: reconfigure vitest; rewrite component tests; lib tests.
7. **Cleanup**: delete Vite/react-router/react-query/`main.tsx`/`routes.tsx`/
   `index.html`; prune deps; final parity pass.

## 10. Parity & behavior

- All five screens behave identically to the merged Vite app (now SSR).
- The empty/loading/error states change shape (server-fetched): loading is the
  server render; errors surface via Next error boundaries / per-page handling;
  the word-of-day 404 still renders a placeholder.
- Session counters / review UX unchanged (client state during a session).

## 11. Risks

- **Large rewrite of just-merged work.** Do it on a dedicated branch
  (`feat/next-replatform`), phased; the Vite FE remains in git history (revert
  path).
- **Hydration/theme** mismatches (handled in §6).
- **Test rewrite** is significant (§8) — budget a full phase.
- The recent **nginx resolver hardening is superseded** (Next replaces nginx).

## 12. Out of scope (later specs, on the Next base)

- **Auth** — kg-style BFF (httpOnly cookie + `middleware.ts` Bearer injection +
  `app/api/auth/*` route handlers + `getSession`) + backend users/JWT (the
  backend spec's documented upgrade path).
- **Guide tour** — onboarding walkthrough (from the v2 mockup).
- Adopting shadcn; server actions everywhere; e2e harness.
