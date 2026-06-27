# Sidebar Real Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Sidebar's hardcoded `streak 12 ngày` and three mockup deck rows with the user's real streak and real decks, fetched server-side and threaded through the same prop chain that already carries `displayName`.

**Architecture:** `frontend/src/app/layout.tsx` (async Server Component) fetches `/progress/summary` and `/decks` alongside its existing `/auth/me` call, soft-failing the same way (`.catch(() => null)` / `.catch(() => [])`, no redirect, since this layout also wraps `/login`). The results flow down as props: `layout.tsx` → `AppShell` → `Sidebar`. `Sidebar` derives what it needs from the raw `ProgressSummary | null` and `DeckOut[]` it receives — no new types, no new i18n keys.

**Tech Stack:** Next.js 15.5 (App Router, Server Components), React 18, TypeScript (strict), Vitest + Testing Library for tests, Zustand for client UI state (unrelated to this change).

## Global Constraints

- Soft-fail fetches in `layout.tsx` only: `.catch(() => null)` / `.catch(() => [] as DeckOut[])` — never `orRedirect` here (would break `/login`, which this layout also renders).
- Reuse existing types verbatim: `ProgressSummary` and `DeckOut` from `frontend/src/lib/api-types.ts`. Do not introduce new "lightweight" deck/summary types.
- Reuse existing i18n keys verbatim: `t.streakLabel(n)`, `t.viewAll`, `t.noDeckYet`, `t.myMistakesDeck`. Do not add new dictionary keys.
- ESLint's `@typescript-eslint/no-unused-vars` is `'error'` (see `frontend/eslint.config.js:31`) with no general unused-args allowance. Every prop a task destructures must be used within that same task — never land a commit with an accepted-but-unused prop.
- Make every new/changed prop **optional** (`summary?: ProgressSummary | null`, `decks?: DeckOut[]`), matching the existing `displayName?: string | null` convention on `AppShell`/`Sidebar`. This is required so the existing `AppShell.test.tsx` and `layout.test.tsx` call sites (which render `<AppShell>{children}</AppShell>` with no data props) keep compiling and passing unmodified.
- `frontend/src/components/layout/Sidebar.tsx` has no test file today. This plan creates one (`Sidebar.test.tsx`) and extends it task-by-task — do not create a second test file for the same component.
- Test commands below assume the working directory is `frontend/`.
- After the final task, the full suite (`npm run test`) and `npx tsc --noEmit` must both be clean — this mirrors the verification already done for the `displayName`/i18n commit this plan builds on.

---

### Task 1: Real streak — thread `summary` through layout → AppShell → Sidebar

**Files:**
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/components/AppShell.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`
- Test: `frontend/src/components/layout/Sidebar.test.tsx` (create)

**Interfaces:**
- Consumes: `ProgressSummary` from `frontend/src/lib/api-types.ts` (`{ streak: number; reviews_today: number; mastery: {...}; weekly_bars: {...}[]; due_total: number }`); `apiFetch` from `frontend/src/lib/api-server.ts`.
- Produces: `Sidebar` accepts `summary?: ProgressSummary | null` and computes `streak = summary?.streak ?? 0` for use in Task 2 and Task 3 (both already receive `streak` as an in-scope local once this task lands — no new prop needed for it).

- [ ] **Step 1: Write the failing tests**

Create `frontend/src/components/layout/Sidebar.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Sidebar } from './Sidebar'
import { useAppStore, initialState } from '../../store/useAppStore'
import { progressSummaryFixture } from '../../test/fixtures'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  usePathname: () => '/',
}))

describe('Sidebar', () => {
  beforeEach(() => {
    localStorage.clear()
    pushMock.mockReset()
    useAppStore.setState({ ...initialState })
  })

  it('renders the real streak count from the summary prop', () => {
    render(<Sidebar summary={{ ...progressSummaryFixture, streak: 7 }} />)
    expect(screen.getByText('streak 7 ngày')).toBeInTheDocument()
  })

  it('falls back to a 0-day streak when summary is null', () => {
    render(<Sidebar summary={null} />)
    expect(screen.getByText('streak 0 ngày')).toBeInTheDocument()
  })
})
```

Note: the fixture's own `streak` is `12`, which collides with the current
hardcoded `12` — that would make the first test pass by coincidence even
without any real wiring. Overriding to `7` is deliberate so this test only
passes once `summary` is actually read.

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/layout/Sidebar.test.tsx`
Expected: both tests FAIL — actual rendered text is `streak 12 ngày` regardless of the prop (current code hardcodes `t.streakLabel(12)` and doesn't accept a `summary` prop at all; TS will also flag the unknown `summary` prop on `<Sidebar>` if you run a typecheck, which is fine — the test still runs and fails on the assertion since ts errors don't block vitest/esbuild transpilation).

- [ ] **Step 3: Thread `summary` through `layout.tsx` → `AppShell` → `Sidebar`**

In `frontend/src/app/layout.tsx`, add the import and change the data fetch to run in parallel:

```tsx
import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '../components/Providers'
import { AppShell } from '../components/AppShell'
import { apiFetch } from '../lib/api-server'
import type { ProgressSummary } from '../lib/api-types'

export const metadata: Metadata = { title: 'Snoopify', description: 'Học từ vựng tiếng Anh' }

const themeScript = `try{var s=JSON.parse(localStorage.getItem('snoopify_v1')||'{}');if(s&&s.state&&s.state.dark){document.documentElement.classList.add('dark')}}catch(e){}`

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Soft-fail, no redirect: this layout also wraps /login, where there's no session yet.
  // Route-level auth is enforced by middleware.ts and each page's own apiFetch(...).catch(orRedirect).
  const [me, summary] = await Promise.all([
    apiFetch<{ display_name: string; email: string }>('/auth/me').catch(() => null),
    apiFetch<ProgressSummary>('/progress/summary').catch(() => null),
  ])

  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Newsreader:wght@400;500;600&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>
          <AppShell displayName={me?.display_name} summary={summary}>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}
```

In `frontend/src/components/AppShell.tsx`, add the import, extend the prop type, and pass `summary` through:

```tsx
'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './layout/Sidebar'
import { Topbar } from './layout/Topbar'
import { GuidedTourOverlay } from './layout/GuidedTourOverlay'
import { useTourStore } from '../store/useTourStore'
import type { ProgressSummary } from '../lib/api-types'

export function AppShell({ children, displayName, summary }: {
  children: React.ReactNode
  displayName?: string | null
  summary?: ProgressSummary | null
}) {
```

(Body unchanged except the `<Sidebar />` call:)

```tsx
      <Sidebar displayName={displayName} summary={summary} />
```

- [ ] **Step 4: Use `summary` in `Sidebar.tsx`**

In `frontend/src/components/layout/Sidebar.tsx`, add the import:

```tsx
import type { ProgressSummary } from '../../lib/api-types'
```

Change the function signature (currently `export function Sidebar({ displayName }: { displayName?: string | null }) {`) to:

```tsx
export function Sidebar({ displayName, summary }: {
  displayName?: string | null
  summary?: ProgressSummary | null
}) {
```

Immediately after the existing `const setPanel = useAppStore((s) => s.setPanel)` line, add:

```tsx
  const streak = summary?.streak ?? 0
```

Change the streak line in the user footer from:

```tsx
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t.streakLabel(12)}</div>
```

to:

```tsx
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t.streakLabel(streak)}</div>
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/layout/Sidebar.test.tsx`
Expected: both tests PASS.

- [ ] **Step 6: Typecheck and run the full suite**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

Run: `cd frontend && npm run test`
Expected: all existing tests still pass (in particular `AppShell.test.tsx` and `components/layout/layout.test.tsx`, which render `<AppShell>` without a `summary` prop — this must still compile and pass since `summary` is optional).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/layout.tsx frontend/src/components/AppShell.tsx frontend/src/components/layout/Sidebar.tsx frontend/src/components/layout/Sidebar.test.tsx
git commit -m "fix(frontend): wire real streak count into Sidebar"
```

---

### Task 2: Real decks — thread `decks` through layout → AppShell → Sidebar

**Files:**
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/components/AppShell.tsx`
- Modify: `frontend/src/components/layout/Sidebar.tsx`
- Test: `frontend/src/components/layout/Sidebar.test.tsx` (extend)

**Interfaces:**
- Consumes: `DeckOut` from `frontend/src/lib/api-types.ts` (`{ id, name, topic, count, due_count, mastery_pct, last_reviewed_at: string | null, created_at, updated_at }`); `streak` local from Task 1 (unchanged); `router`/`t` locals already in scope in `Sidebar`.
- Produces: `Sidebar` accepts `decks?: DeckOut[]` and renders a `recentDecks` (top 3 by `last_reviewed_at` desc, nulls last) list. Task 3 relies on this same rendering block still being present (it only adds an `onClick` to the unrelated "mistakes" row below it).

- [ ] **Step 1: Write the failing tests**

Add these imports to the top of `frontend/src/components/layout/Sidebar.test.tsx` (alongside the existing ones):

```tsx
import userEvent from '@testing-library/user-event'
import { decksFixture } from '../../test/fixtures'
import type { DeckOut } from '../../lib/api-types'
```

Add this fixture above the `describe` block:

```tsx
const manyDecksFixture: DeckOut[] = [
  { id: 'a', name: 'Alpha', topic: 't', count: 1, due_count: 0, mastery_pct: 0, last_reviewed_at: '2026-06-10T00:00:00Z', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-06-10T00:00:00Z' },
  { id: 'b', name: 'Bravo', topic: 't', count: 1, due_count: 0, mastery_pct: 0, last_reviewed_at: '2026-06-20T00:00:00Z', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-06-20T00:00:00Z' },
  { id: 'c', name: 'Charlie', topic: 't', count: 1, due_count: 0, mastery_pct: 0, last_reviewed_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'd', name: 'Delta', topic: 't', count: 1, due_count: 0, mastery_pct: 0, last_reviewed_at: '2026-06-25T00:00:00Z', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-06-25T00:00:00Z' },
]
```

Add these tests inside the existing `describe('Sidebar', ...)` block:

```tsx
  it('renders up to 3 decks, most recently reviewed first', () => {
    render(<Sidebar decks={manyDecksFixture} />)
    const names = screen.getAllByText(/^(Alpha|Bravo|Charlie|Delta)$/).map((el) => el.textContent)
    expect(names).toEqual(['Delta', 'Bravo', 'Alpha'])
  })

  it('shows a "view all" link only when there are more than 3 decks, and it navigates to /library', async () => {
    render(<Sidebar decks={manyDecksFixture} />)
    const viewAll = screen.getByText('Xem tất cả →')
    expect(viewAll).toBeInTheDocument()
    await userEvent.click(viewAll)
    expect(pushMock).toHaveBeenCalledWith('/library')
  })

  it('hides the "view all" link when there are 3 or fewer decks', () => {
    render(<Sidebar decks={decksFixture} />)
    expect(screen.queryByText('Xem tất cả →')).not.toBeInTheDocument()
  })

  it('shows an empty state when there are no decks, without losing the tour anchor', () => {
    render(<Sidebar decks={[]} />)
    expect(screen.getByText('(chưa có bộ thẻ)')).toBeInTheDocument()
    // The "mistakes" row always renders, so [data-tour="decks"] never collapses
    // to zero height even with an empty deck list (regression guard for the
    // guided-tour rect bug fixed in 08280fe).
    expect(screen.getByText('Lỗi của tôi')).toBeInTheDocument()
  })

  it('navigates to /library when a deck row is clicked', async () => {
    render(<Sidebar decks={decksFixture} />)
    await userEvent.click(screen.getByText('Business English'))
    expect(pushMock).toHaveBeenCalledWith('/library')
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd frontend && npx vitest run src/components/layout/Sidebar.test.tsx`
Expected: 4 of the 5 new tests FAIL (current code still renders the 2 hardcoded fake deck names regardless of any `decks` prop, has no empty state, and no "view all" link/`onClick`). The "hides the 'view all' link when there are 3 or fewer decks" test passes immediately — there's nothing to show or hide yet, so its absence is indistinguishable from the not-yet-built feature's absence. That's expected and fine: it becomes a real regression guard once Step 4 lands.

- [ ] **Step 3: Thread `decks` through `layout.tsx` → `AppShell`**

In `frontend/src/app/layout.tsx`, change the `ProgressSummary` type import line to also import `DeckOut`, and extend the `Promise.all`:

```tsx
import type { ProgressSummary, DeckOut } from '../lib/api-types'
```

```tsx
  const [me, summary, decks] = await Promise.all([
    apiFetch<{ display_name: string; email: string }>('/auth/me').catch(() => null),
    apiFetch<ProgressSummary>('/progress/summary').catch(() => null),
    apiFetch<DeckOut[]>('/decks').catch(() => [] as DeckOut[]),
  ])
```

```tsx
          <AppShell displayName={me?.display_name} summary={summary} decks={decks}>{children}</AppShell>
```

In `frontend/src/components/AppShell.tsx`, extend the type import and prop type, and pass `decks` through:

```tsx
import type { ProgressSummary, DeckOut } from '../lib/api-types'

export function AppShell({ children, displayName, summary, decks }: {
  children: React.ReactNode
  displayName?: string | null
  summary?: ProgressSummary | null
  decks?: DeckOut[]
}) {
```

```tsx
      <Sidebar displayName={displayName} summary={summary} decks={decks} />
```

- [ ] **Step 4: Render real decks in `Sidebar.tsx`**

Change the type import to include `DeckOut`:

```tsx
import type { ProgressSummary, DeckOut } from '../../lib/api-types'
```

Add `useMemo` to the React import (currently `Sidebar.tsx` has no React import line since it only uses hooks from `next/navigation`/`useAppStore`/`useT` — add a new import line for it):

```tsx
import { useMemo } from 'react'
```

Add a small color constant near the top of the file, just above `const navItems = ...`:

```tsx
const DECK_DOT_COLORS = ['var(--accent,#2f5d4e)', '#c9a23a']
```

Extend the `Sidebar` signature to accept `decks`:

```tsx
export function Sidebar({ displayName, summary, decks }: {
  displayName?: string | null
  summary?: ProgressSummary | null
  decks?: DeckOut[]
}) {
```

Immediately after the `const streak = summary?.streak ?? 0` line added in Task 1, add:

```tsx
  const recentDecks = useMemo(() => {
    return [...(decks ?? [])]
      .sort((a, b) => {
        if (!a.last_reviewed_at && !b.last_reviewed_at) return 0
        if (!a.last_reviewed_at) return 1
        if (!b.last_reviewed_at) return -1
        return b.last_reviewed_at.localeCompare(a.last_reviewed_at)
      })
      .slice(0, 3)
  }, [decks])
```

Replace the two hardcoded deck rows:

```tsx
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent,#2f5d4e)', display: 'inline-block' }} />
            Business English
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: '#c9a23a', display: 'inline-block' }} />
            Idioms &amp; Phrasal
          </div>
```

with:

```tsx
          {recentDecks.length === 0 && (
            <div style={{ color: 'var(--muted)' }}>{t.noDeckYet}</div>
          )}
          {recentDecks.map((deck, i) => (
            <div
              key={deck.id}
              onClick={() => router.push('/library')}
              style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 2, background: DECK_DOT_COLORS[i % DECK_DOT_COLORS.length], display: 'inline-block' }} />
              {deck.name}
            </div>
          ))}
          {(decks ?? []).length > 3 && (
            <div
              onClick={() => router.push('/library')}
              style={{ color: 'var(--accent,#2f5d4e)', cursor: 'pointer' }}
            >
              {t.viewAll}
            </div>
          )}
```

Leave the "Lỗi của tôi" / `{t.myMistakesDeck}` row exactly as-is for now (Task 3 changes it).

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/layout/Sidebar.test.tsx`
Expected: all tests (Task 1's + the 5 new ones) PASS.

- [ ] **Step 6: Typecheck and run the full suite**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

Run: `cd frontend && npm run test`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/layout.tsx frontend/src/components/AppShell.tsx frontend/src/components/layout/Sidebar.tsx frontend/src/components/layout/Sidebar.test.tsx
git commit -m "fix(frontend): wire real decks list into Sidebar"
```

---

### Task 3: Wire the "my mistakes" shortcut to /progress

**Files:**
- Modify: `frontend/src/components/layout/Sidebar.tsx`
- Test: `frontend/src/components/layout/Sidebar.test.tsx` (extend)

**Interfaces:**
- Consumes: `router` local already in scope in `Sidebar` (from `useRouter()`); `t.myMistakesDeck` (existing i18n key, unchanged).
- Produces: nothing new consumed by later work — this is the last task in the plan.

- [ ] **Step 1: Write the failing test**

Add this test inside the existing `describe('Sidebar', ...)` block in `frontend/src/components/layout/Sidebar.test.tsx`:

```tsx
  it('navigates to /progress when the "my mistakes" row is clicked', async () => {
    render(<Sidebar />)
    await userEvent.click(screen.getByText('Lỗi của tôi'))
    expect(pushMock).toHaveBeenCalledWith('/progress')
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/layout/Sidebar.test.tsx`
Expected: FAIL — `pushMock` is never called (the row has no `onClick` yet).

- [ ] **Step 3: Add the click handler**

In `frontend/src/components/layout/Sidebar.tsx`, change:

```tsx
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', color: 'var(--rust)' }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--rust)', display: 'inline-block' }} />
            {t.myMistakesDeck}
          </div>
```

to:

```tsx
          <div
            onClick={() => router.push('/progress')}
            style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', color: 'var(--rust)' }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--rust)', display: 'inline-block' }} />
            {t.myMistakesDeck}
          </div>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/layout/Sidebar.test.tsx`
Expected: PASS — all tests in the file (8 total across the 3 tasks) green.

- [ ] **Step 5: Full verification sweep**

Run: `cd frontend && npx tsc --noEmit`
Expected: no errors.

Run: `cd frontend && npm run test`
Expected: entire suite passes (no regressions in `AppShell.test.tsx`, `components/layout/layout.test.tsx`, or anywhere else).

Run: `cd frontend && npm run build`
Expected: build succeeds (this exercises `layout.tsx`'s new server-side fetch wiring, which isn't covered by any unit test per this repo's convention).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/layout/Sidebar.tsx frontend/src/components/layout/Sidebar.test.tsx
git commit -m "fix(frontend): link mistakes shortcut to /progress"
```

## Out of scope (carried over from the spec)

- Per-deck deep links from the sidebar into `LibraryScreen` — rows route to the general `/library` page.
- A real "mistakes" feature/endpoint — the row stays a static, non-data-driven shortcut.
- Backend pagination/limit on `GET /decks` — the top-3 slicing happens client-side in `Sidebar`.
- Retrofitting `RecentlyAdded.tsx`'s already-decorative "View all" link — unrelated, pre-existing gap.
