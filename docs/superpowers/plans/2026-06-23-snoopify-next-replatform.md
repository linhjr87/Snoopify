# Snoopify Next.js Replatform — Implementation Plan (Increment 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up Next.js (App Router, server-first) over the existing Snoopify frontend and prove the stack end-to-end with the Dashboard screen + Docker — without breaking the still-Vite screens.

**Architecture:** Next 15 App Router under `frontend/src/app`. Server `page.tsx` fetch reads via `lib/api.apiFetch` (calls `BACKEND_URL` directly); client components handle interactivity (`fetch('/api/...')` → Next rewrites strip `/api` → backend → `router.refresh()`). Existing inline-style components + Tailwind v3 + theme tokens + Zustand are kept. The Vite entry/deps stay installed and dormant this increment (removed in the cleanup plan) so the test suite stays green throughout.

**Tech Stack:** Next 15, React 18, TypeScript, Tailwind v3, Zustand, Vitest + @testing-library.

## Global Constraints

- **Branch:** `feat/next-replatform`. Reference: `kg_intelligence` (`D:\WORK\DEV\kg_intelligence/frontend`).
- **App Router under `frontend/src/app`** (Next `src` convention); existing code stays under `frontend/src/{components,features,lib,store,i18n,theme,data}` — relative imports unchanged.
- **Server-first:** reads in server `page.tsx` via `apiFetch`; client mutations via `fetch('/api/...')` + `router.refresh()`. **No TanStack Query in new code.**
- **Proxy:** `next.config.ts` rewrites `/api/:path* → ${BACKEND_URL}/:path*` (**strip `/api`** — backend serves at root). `output: 'standalone'`.
- **`BACKEND_URL`** server-side (build arg + env); browser calls relative `/api/*`. Server `apiFetch` calls `BACKEND_URL` directly (no `/api`).
- **Keep** Tailwind v3, theme tokens, inline-style UI, Zustand (UI-state). **Do not** add shadcn/next-themes/react-query.
- **Do NOT remove** `vite`/`react-router-dom`/`@tanstack/react-query` this increment (the un-ported screens + their tests still use them). They go in the cleanup plan.
- Frontend **port 3000**. Theme: blocking inline script toggles `html.dark`; client `Providers` reconciles on mount.
- Keep the suite green per task. UI copy stays Vietnamese. TDD/verify, commit per task.
- Out of scope: porting Library/Review/Add/Progress (one follow-up plan each), full test migration, dep cleanup, auth, guide tour.

---

## File Structure (this increment)

- Create: `frontend/next.config.ts`, `frontend/next-env.d.ts`, `frontend/tsconfig.json` (Next), `frontend/src/app/layout.tsx`, `frontend/src/app/globals.css`, `frontend/src/app/page.tsx` (Dashboard), `frontend/src/components/Providers.tsx`, `frontend/src/components/AppShell.tsx`, `frontend/Dockerfile` (replace), `frontend/.dockerignore` (keep), root `docker-compose.yml` (modify `frontend` svc).
- Modify (port): `frontend/package.json` (scripts + add `next`), `frontend/src/lib/api.ts` (add server `apiFetch`), `frontend/src/components/layout/{Sidebar,Topbar,SettingsPanel,LangMenu,NotificationsMenu}.tsx` (`'use client'` + router swap), the 6 dashboard widgets, `frontend/src/features/dashboard/dashboard.test.tsx`, root `package.json` (dev script).
- Leave intact (dormant): `frontend/index.html`, `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/routes.tsx`, `frontend/vite.config.ts`, `frontend/src/lib/queryClient.ts`, the other `features/*/queries.ts` + their screens/tests.

---

## Task 1: Scaffold Next (app boots on Next, suite still green)

**Files:** Create `frontend/next.config.ts`, `frontend/tsconfig.json`, `frontend/next-env.d.ts`, `frontend/src/app/globals.css`, `frontend/src/app/layout.tsx`, `frontend/src/components/Providers.tsx`, `frontend/src/app/page.tsx` (temporary); Modify `frontend/package.json`.

**Interfaces:**
- Produces: a booting Next app; `Providers` (client) applying theme on mount; `globals.css` with the theme tokens.

- [ ] **Step 1: Update `frontend/package.json`** — add Next + Next scripts; keep all existing deps (Vite etc. stay). Replace the `scripts` block and add `next` to `dependencies`:

```jsonc
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest run --passWithNoTests",
    "test:watch": "vitest"
  },
```
Add to `dependencies`: `"next": "^15.5.0"`. Add to `devDependencies`: `"eslint-config-next": "^15.5.0"`. (Do not remove anything.)

- [ ] **Step 2: Create `frontend/next.config.ts`**

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? 'http://localhost:8000'
    return [{ source: '/api/:path*', destination: `${backend}/:path*` }]
  },
}

export default nextConfig
```

- [ ] **Step 3: Create `frontend/tsconfig.json`** (Next-compatible)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 4: Create `frontend/next-env.d.ts`**

```ts
/// <reference types="next" />
/// <reference types="next/image-types/global" />
```

- [ ] **Step 5: Create `frontend/src/app/globals.css`** — copy the current `frontend/src/index.css` verbatim (the `@tailwind` directives, the `:root` + `html.dark` token vars, body, chrome layout, media queries). It already defines light defaults in `:root` and dark in `html.dark`, so SSR renders light and the inline script (Step 6) only toggles the `dark` class.

- [ ] **Step 6: Create `frontend/src/components/Providers.tsx`** (client — reconcile theme on mount)

```tsx
'use client'
import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { applyTheme } from '../theme/tokens'

export function Providers({ children }: { children: React.ReactNode }) {
  const dark = useAppStore((s) => s.dark)
  useEffect(() => { applyTheme(dark) }, [dark])
  return <>{children}</>
}
```

- [ ] **Step 7: Create `frontend/src/app/layout.tsx`** (root layout + no-flash theme script)

```tsx
import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '../components/Providers'

export const metadata: Metadata = { title: 'Snoopify', description: 'Học từ vựng tiếng Anh' }

// Set the dark class before paint from the persisted Zustand store (key snoopify_v1).
const themeScript = `try{var s=JSON.parse(localStorage.getItem('snoopify_v1')||'{}');if(s&&s.state&&s.state.dark){document.documentElement.classList.add('dark')}}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Newsreader:wght@400;500;600&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
```

- [ ] **Step 8: Create a temporary `frontend/src/app/page.tsx`** (replaced in Task 4)

```tsx
export default function Page() {
  return <main style={{ padding: 40 }}>Snoopify on Next — scaffold OK</main>
}
```

- [ ] **Step 9: Install + verify Next boots and the suite is still green**

Run: `cd frontend && npm install`
Run: `cd frontend && npm run build`
Expected: Next build succeeds (`.next/` produced; route `/` listed). Resolve any dep/version conflict until the build is green.
Run: `cd frontend && npm test`
Expected: existing Vitest suite still passes (old screens untouched; they still use Vite/react-router/react-query, all still installed).

- [ ] **Step 10: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/next.config.ts frontend/tsconfig.json frontend/next-env.d.ts frontend/src/app/ frontend/src/components/Providers.tsx
git commit -m "build(frontend): scaffold Next App Router (boots; Vite suite still green)"
```

---

## Task 2: AppShell (port the layout shell to Next)

**Files:** Create `frontend/src/components/AppShell.tsx`; Modify `frontend/src/app/layout.tsx`, `frontend/src/components/layout/{Sidebar,Topbar,SettingsPanel,LangMenu,NotificationsMenu}.tsx`.

**Interfaces:**
- Consumes: `Providers` (Task 1), existing layout components, Zustand store.
- Produces: `AppShell` (client) rendering Sidebar + Topbar + `<main>{children}</main>`; layout wraps children in it.

- [ ] **Step 1: Port the layout components to client + Next navigation**

For each of `Sidebar.tsx`, `Topbar.tsx`, `SettingsPanel.tsx`, `LangMenu.tsx`, `NotificationsMenu.tsx`: add `'use client'` as the first line.

In `Sidebar.tsx` only, swap react-router for Next navigation:
- Replace `import { useNavigate, useLocation } from 'react-router-dom'` with `import { useRouter, usePathname } from 'next/navigation'`.
- Replace `const navigate = useNavigate()` with `const router = useRouter()` and `const location = useLocation()` with `const pathname = usePathname()`.
- Replace `onClick={() => navigate(item.to)}` with `onClick={() => router.push(item.to)}`.
- Replace the `isActive` computation's `location.pathname` with `pathname`.

(The other four components have no react-router usage — only the `'use client'` directive is added. All JSX/styles are unchanged.)

- [ ] **Step 2: Create `frontend/src/components/AppShell.tsx`** (port of the old `App.tsx` shell, using children)

```tsx
'use client'
import { Sidebar } from './layout/Sidebar'
import { Topbar } from './layout/Topbar'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--paper)' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '34px 46px', maxWidth: 1180, margin: '0 auto', width: '100%' }}>
        <Topbar />
        {children}
      </main>
    </div>
  )
}
```

(If the current `frontend/src/App.tsx` uses different shell markup/styles, copy those exact wrapper styles here instead — match the existing layout.)

- [ ] **Step 3: Wrap children in `AppShell` in `frontend/src/app/layout.tsx`**

Change the body to:

```tsx
      <body>
        <Providers><AppShell>{children}</AppShell></Providers>
      </body>
```

Add the import: `import { AppShell } from '../components/AppShell'`.

- [ ] **Step 4: Verify shell renders + nav works + suite green**

Run: `cd frontend && npm run build`
Expected: build succeeds.
Run: `cd frontend && npm run dev` then open `http://localhost:3000` — the sidebar/topbar render; clicking nav items routes (will 404 on routes not created yet except `/`). Stop the server.
Run: `cd frontend && npm test`
Expected: existing suite still green (old layout.test.tsx renders the old App via Vite — untouched).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/AppShell.tsx frontend/src/components/layout/ frontend/src/app/layout.tsx
git commit -m "feat(frontend): port layout shell (Sidebar/Topbar) to Next client components"
```

---

## Task 3: Server data layer (`apiFetch`)

**Files:** Modify `frontend/src/lib/api.ts`; Test `frontend/src/lib/api.test.ts`.

**Interfaces:**
- Produces: `apiFetch<T>(path: string): Promise<T>` (server-side; calls `BACKEND_URL` directly, no `/api`, `cache: 'no-store'`, throws on non-OK). The existing client `apiGet/apiPost` (base `/api`) stay for client mutations.

- [ ] **Step 1: Add the failing test to `frontend/src/lib/api.test.ts`**

```ts
import { apiFetch } from './api'
// inside the existing describe or a new one:
it('apiFetch hits BACKEND_URL directly and returns JSON', async () => {
  const spy = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => fakeResponse({ ok: 1 }, 200))
  vi.stubGlobal('fetch', spy)
  const data = await apiFetch<{ ok: number }>('/review/session')
  expect(data).toEqual({ ok: 1 })
  expect(String(spy.mock.calls[0][0])).toContain('/review/session')
  expect(String(spy.mock.calls[0][0])).not.toContain('/api/')
})
```
(`fakeResponse` + `vi` are already imported in this test file.)

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npx vitest run src/lib/api.test.ts -t apiFetch`
Expected: FAIL — `apiFetch` is not exported.

- [ ] **Step 3: Add `apiFetch` to `frontend/src/lib/api.ts`** (append; leave `apiGet/apiPost/ApiError` unchanged)

```ts
const BACKEND = (process.env.BACKEND_URL as string | undefined) ?? 'http://localhost:8000'

export async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BACKEND}${path}`, { cache: 'no-store' })
  if (!res.ok) throw new ApiError(res.status, res.statusText)
  return (await res.json()) as T
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/lib/api.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/lib/api.test.ts
git commit -m "feat(frontend): server-side apiFetch (BACKEND_URL direct)"
```

---

## Task 4: Dashboard vertical slice (server page + client/server widgets)

Proves the server-first pattern: `app/page.tsx` server-fetches, widgets render from props, the reset mutation uses fetch + `router.refresh()`.

**Files:** Modify `frontend/src/app/page.tsx`; modify the 6 dashboard widgets + `SettingsPanel.tsx`; rewrite `frontend/src/features/dashboard/dashboard.test.tsx`.

**Interfaces:**
- Consumes: `apiFetch` (Task 3); existing types `ProgressSummary`, `WordOfDayOut`, `CardOut` (lib/api-types).
- Produces: widget prop signatures (below) consumed by `app/page.tsx`.

- [ ] **Step 1: Convert the dashboard widgets from hooks to props.** For each, remove its `./queries` import + the `useXxx()` hook line and take the data as a prop; **the JSX body is unchanged**. New signatures/top-of-file:

`TodaySession.tsx` (keeps `'use client'` — it navigates):
```tsx
'use client'
import { useRouter } from 'next/navigation'
import { useT } from '../../i18n/useT'
import type { ProgressSummary } from '../../lib/api-types'
const CIRC = 2 * Math.PI * 60
export function TodaySession({ summary }: { summary: ProgressSummary | null }) {
  const t = useT()
  const router = useRouter()
  const reviewed = summary?.reviews_today ?? 0
  const due = summary?.due_total ?? 0
  const target = reviewed + due
  const offset = target > 0 ? CIRC * (1 - reviewed / target) : CIRC
  // ...rest of existing JSX unchanged, but replace nav('/review') with router.push('/review')
```

`Streak.tsx` (no handlers → server component, no `'use client'`):
```tsx
import type { ProgressSummary } from '../../lib/api-types'
export function Streak({ summary }: { summary: ProgressSummary | null }) {
  const streak = summary?.streak ?? 0
  const bars = summary?.weekly_bars ?? []
  const todayIdx = (new Date().getDay() + 6) % 7
  const chips = bars.map((b, i) => ({ label: b.label, filled: b.count > 0, today: i === todayIdx }))
  // ...rest of existing JSX unchanged
```

`WeekProgress.tsx` (server component):
```tsx
import type { ProgressSummary } from '../../lib/api-types'
export function WeekProgress({ summary }: { summary: ProgressSummary | null }) {
  const m = summary?.mastery ?? { new: 0, learning: 0, proficient: 0 }
  const learned = m.learning + m.proficient
  const bars = summary?.weekly_bars ?? []
  const daysActive = bars.filter((b) => b.count > 0).length
  const weekPct = Math.round((daysActive / 7) * 100)
  // ...rest of existing JSX unchanged (use m.proficient, learned, weekPct, daysActive)
```

`WordOfDay.tsx` (server component):
```tsx
import type { WordOfDayOut } from '../../lib/api-types'
export function WordOfDay({ word }: { word: WordOfDayOut | null }) {
  const phon = word ? [word.phonetic, word.pos].filter(Boolean).join(' · ') : ''
  // ...rest of existing JSX unchanged (render `word` fields or the "Chưa có thẻ" placeholder)
```

`RecentlyAdded.tsx` (server component):
```tsx
import type { CardOut } from '../../lib/api-types'
import { formatRelativeVi } from '../../lib/format'
export function RecentlyAdded({ cards }: { cards: CardOut[] }) {
  const items = cards ?? []
  // ...rest of existing JSX unchanged (map items; when = formatRelativeVi(c.created_at))
```

`QuickAdd.tsx` (`'use client'` if it navigates; else use `next/link`): replace any `useNavigate`/`nav('/add')` with `import Link from 'next/link'` and a `<Link href="/add">` wrapper (or `useRouter().push('/add')` with `'use client'`).

- [ ] **Step 2: Replace `frontend/src/app/page.tsx`** with the Dashboard server page

```tsx
import { apiFetch } from '../lib/api'
import type { ProgressSummary, WordOfDayOut, CardOut } from '../lib/api-types'
import { TodaySession } from '../features/dashboard/TodaySession'
import { Streak } from '../features/dashboard/Streak'
import { QuickAdd } from '../features/dashboard/QuickAdd'
import { RecentlyAdded } from '../features/dashboard/RecentlyAdded'
import { WordOfDay } from '../features/dashboard/WordOfDay'
import { WeekProgress } from '../features/dashboard/WeekProgress'

export default async function DashboardPage() {
  const [summary, word, cards] = await Promise.all([
    apiFetch<ProgressSummary>('/progress/summary').catch(() => null),
    apiFetch<WordOfDayOut>('/dashboard/word-of-day').catch(() => null),
    apiFetch<CardOut[]>('/cards/recent?limit=3').catch(() => [] as CardOut[]),
  ])
  return (
    <div style={{ animation: 'fadeUp .5s ease both' }}>
      <div style={{ display: 'flex', gap: '22px', marginBottom: '22px', flexWrap: 'wrap' }}>
        <TodaySession summary={summary} />
        <Streak summary={summary} />
      </div>
      <QuickAdd />
      <div style={{ display: 'flex', gap: '22px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <RecentlyAdded cards={cards} />
        <div style={{ width: '330px', flex: 'none', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <WordOfDay word={word} />
          <WeekProgress summary={summary} />
        </div>
      </div>
    </div>
  )
}
```

(The greeting/search header from the old `DashboardScreen` can move here verbatim if desired; it uses `useT` which is a client hook, so wrap it in a tiny client header component or omit the dynamic date. Keep parity by porting the header into a `'use client'` `DashboardHeader` component.)

- [ ] **Step 3: Wire Settings reset to fetch + refresh in `SettingsPanel.tsx`**

Replace the reset handler so "Xoá hết" calls the API then refreshes:

```tsx
'use client'
import { useRouter } from 'next/navigation'
// ...
  const router = useRouter()
  const handleReset = async () => {
    await fetch('/api/progress/reset', { method: 'POST' })
    resetProgress()        // existing Zustand UI reset
    router.refresh()       // re-run server fetches
  }
```
Point the "Xoá hết" button's `onClick` at `handleReset`. (Remove the `useResetProgress` import if present.)

- [ ] **Step 4: Rewrite `frontend/src/features/dashboard/dashboard.test.tsx`** — test the widgets via props (server-first makes them prop-driven), mocking `next/navigation`:

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TodaySession } from './TodaySession'
import { WordOfDay } from './WordOfDay'
import { progressSummaryFixture, wordOfDayFixture } from '../../test/fixtures'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
afterEach(() => vi.restoreAllMocks())

describe('dashboard widgets (props-driven)', () => {
  it('TodaySession shows reviews_today / target from summary', () => {
    render(<TodaySession summary={progressSummaryFixture} />)
    expect(screen.getByText('/24')).toBeInTheDocument() // 8 reviewed + 16 due
  })
  it('WordOfDay renders the word', () => {
    render(<WordOfDay word={wordOfDayFixture} />)
    expect(screen.getByText('serendipity')).toBeInTheDocument()
  })
})
```

- [ ] **Step 5: Verify the slice + build + suite**

Run: `cd frontend && npx vitest run src/features/dashboard/dashboard.test.tsx`
Expected: PASS (2).
Run: `cd frontend && npm run build && npm test`
Expected: build succeeds; full suite green (the old `features/dashboard/queries.ts` is now unused but still present — left for cleanup; no other screen touched).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/page.tsx frontend/src/features/dashboard/ frontend/src/components/layout/SettingsPanel.tsx
git commit -m "feat(frontend): Dashboard as Next server page + prop-driven widgets"
```

---

## Task 5: Docker (Next standalone) + dev orchestration

**Files:** Replace `frontend/Dockerfile`; modify root `docker-compose.yml`, root `package.json`.

**Interfaces:** none (ops). Verified via Docker.

- [ ] **Step 1: Replace `frontend/Dockerfile`** (mirror kg's Next standalone)

```dockerfile
# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
ARG BACKEND_URL=http://api:8000
ENV BACKEND_URL=$BACKEND_URL
RUN npm run build

# Production stage
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```
(Create an empty `frontend/public/.gitkeep` if `public/` doesn't exist, so the COPY succeeds.)

- [ ] **Step 2: Update the `frontend` service in root `docker-compose.yml`**

```yaml
  frontend:
    build:
      context: ./frontend
      args:
        BACKEND_URL: http://api:8000
    environment:
      BACKEND_URL: http://api:8000
    ports:
      - "3000:3000"
    depends_on:
      - api
```
Delete the `nginx.conf` reference (the file is removed in the cleanup plan; the new Dockerfile doesn't use it).

- [ ] **Step 3: Update the root `package.json` dev script** so the native FE runs `next dev`:

```jsonc
"dev": "concurrently -k -n api,web -c blue,green \"docker compose up db api\" \"npm --prefix frontend run dev\"",
```
(`npm --prefix frontend run dev` now runs `next dev` on port 3000.)

- [ ] **Step 4: Verify the build + full stack**

Run: `cd frontend && npm run build` — succeeds (standalone output in `.next/standalone`).
Run (Docker, from repo root): `docker compose up -d --build db api frontend` then
`curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/` → `200`, and
`curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/health` → `200` (proxied, `/api` stripped). Then `docker compose down`.
(Requires Docker; ensure port 5432/8000 aren't held by the old `backend/` compose.)

- [ ] **Step 5: Commit**

```bash
git add frontend/Dockerfile frontend/public docker-compose.yml package.json
git commit -m "build(frontend): Next standalone Docker + compose/dev orchestration (port 3000)"
```

---

## Follow-up plans (not in this increment)

1. **Port Library** — `app/library/page.tsx` server-fetch `/decks`; client filter/group + import modal (`POST /decks/import` + refresh) + new-deck.
2. **Port Review** — `app/review/page.tsx` server-fetch `/review/session` once; client `ReviewScreen` holds the session; grade via fetch.
3. **Port Add** — `app/add/page.tsx` server-fetch `/decks`; client form `POST /decks/{id}/cards` + inline create + refresh.
4. **Port Progress** — `app/progress/page.tsx` server-fetch summary/heatmap/needs-review; client/server widgets.
5. **Test migration** — reconfigure Vitest for Next; rewrite remaining component tests (mock `next/navigation`; drop QueryClientProvider/MemoryRouter); add a `next/navigation` mock + new `renderWithProviders`.
6. **Cleanup** — delete `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/routes.tsx`, `src/lib/queryClient.ts`, every `features/*/queries.ts`, `nginx.conf`; remove deps `vite`, `@vitejs/plugin-react`, `react-router-dom`, `@tanstack/react-query`; final parity pass.

Then: **auth** (kg BFF cookie + backend users/JWT) and **guide tour** — separate specs on the Next base.

---

## Self-Review

**Spec coverage (spec → task):** §3/§4 Next App Router + structure → Tasks 1–2. §5 server `apiFetch` + client fetch+refresh → Tasks 3–4. §6 theme inline script + Providers + Zustand → Task 1. §7 rewrites/standalone/Docker/dev/port-3000 → Tasks 1 & 5. Dashboard slice (§9 phase 4) → Task 4. §8 test approach (props + mock next/navigation) → Task 4 (full migration deferred per §9/§12). Remaining screens + cleanup + auth/tour → Follow-up plans. ✓

**Placeholder scan:** New files have complete code; ports are precise edit-lists on named files with JSX explicitly "unchanged" (mechanical conversion, not a placeholder); verify steps give exact commands + expected output. The one judgment area (exact dep versions) is pinned by the "build green" verify step. ✓

**Type consistency:** `apiFetch<T>` (Task 3) used by `app/page.tsx` (Task 4). Widget prop types (`ProgressSummary`/`WordOfDayOut`/`CardOut`) match `lib/api-types`. `Providers`/`AppShell` names match their imports in `layout.tsx`. Fixtures (`progressSummaryFixture`, `wordOfDayFixture`) exist from the prior integration. ✓

**Note (carried):** Keeping Vite/react-router/react-query installed this increment is deliberate (suite stays green); they're removed in the Cleanup follow-up. The old `features/dashboard/queries.ts` is left unused until then.
