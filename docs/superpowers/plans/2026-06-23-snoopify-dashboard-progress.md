# Snoopify Dashboard + Progress + Settings Reset — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Dashboard and Progress screens (and the Settings "reset progress" action) to the real API, replacing every hardcoded/seed number with live data.

**Architecture:** Follow-up Plan 3 (final read-screens plan) of the FE↔BE integration, frontend-only, on branch `feat/frontend-integration`. Reuses the harness (`lib/api.ts`, React Query, `renderWithProviders`/`fakeResponse`/`fixtures.ts`) and group 1's `formatRelativeVi` (moved to a shared `lib/format.ts`). All progress numbers come from `/progress/summary`, `/progress/heatmap`, `/progress/needs-review`, `/dashboard/word-of-day`, `/cards/recent`; reset hits `/progress/reset`. No backend change.

**Tech Stack:** React 18, Vite, TypeScript, `@tanstack/react-query` v5, Vitest + @testing-library.

## Global Constraints

- **Branch:** `feat/frontend-integration`.
- FE always calls relative `/api/*`; server-state → React Query (v5 object syntax); UI-state → Zustand.
- **DECISION 2a:** the 4 Progress StatTiles are replaced with API-available numbers — streak, proficient count, due total, reviews today. Accuracy / all-time-review-count tiles are dropped (no endpoint). No backend change.
- Backend response shapes (mirror exactly): `ProgressSummary {streak, reviews_today, mastery:{new,learning,proficient}, weekly_bars:[{label,count}], due_total}`; `HeatmapOut {cells:int[126]}`; `NeedsReviewItem {card_id, word, lapses}`; `WordOfDayOut {card_id, word, phonetic, pos, meaning, example}` (404 when no cards); `/cards/recent` → `CardOut[]`; `/progress/reset` → `{reset:int}`.
- `/dashboard/word-of-day` returns 404 on an empty DB → `useWordOfDay` must `retry: false` and the widget renders a placeholder on error.
- Keep `npm run build` (tsc -b) green and the full Vitest suite passing. UI copy stays Vietnamese. DRY, YAGNI, TDD, commit per task.
- Out of scope: `QuickAdd` inline-add (stays a nav shortcut); the deferred polish items from Plans 1–2.

---

## File Structure

**Task 1 (foundation):**
- Modify `frontend/src/lib/api-types.ts` — add `MasteryCounts`, `WeeklyBar`, `ProgressSummary`, `HeatmapOut`, `NeedsReviewItem`, `WordOfDayOut`.
- Create `frontend/src/lib/format.ts` — `formatRelativeVi` (moved from `deck-view.ts`).
- Modify `frontend/src/features/library/deck-view.ts` — import `formatRelativeVi` from `lib/format`.
- Create `frontend/src/features/progress/queries.ts` — `useProgressSummary`, `useHeatmap`, `useNeedsReview`, `useResetProgress`.
- Create `frontend/src/features/dashboard/queries.ts` — `useWordOfDay`, `useRecentCards`.
- Modify `frontend/src/test/fixtures.ts` — add the 5 fixtures.
- Create `frontend/src/features/progress/queries.test.tsx`.

**Task 2 (Progress screen):** `ProgressScreen.tsx`, `Calendar.tsx`, `ReviewBars.tsx`, `MasteryLevels.tsx`, `NeedsReview.tsx`, `progress.test.tsx`.

**Task 3 (Dashboard screen):** `TodaySession.tsx`, `Streak.tsx`, `WeekProgress.tsx`, `WordOfDay.tsx`, `RecentlyAdded.tsx`, `dashboard.test.tsx`, **and** `components/layout/layout.test.tsx` (App renders Dashboard).

**Task 4 (Settings reset):** `components/layout/SettingsPanel.tsx`, `components/layout/layout.test.tsx`.

---

## Task 1: Foundation — types, shared format util, query hooks, fixtures

**Files:**
- Modify: `frontend/src/lib/api-types.ts`, `frontend/src/features/library/deck-view.ts`, `frontend/src/test/fixtures.ts`
- Create: `frontend/src/lib/format.ts`, `frontend/src/features/progress/queries.ts`, `frontend/src/features/dashboard/queries.ts`, `frontend/src/features/progress/queries.test.tsx`

**Interfaces:**
- Consumes: `apiGet`/`apiPost` (lib/api), `CardOut` (group 2, lib/api-types).
- Produces:
  - Types `MasteryCounts`, `WeeklyBar`, `ProgressSummary`, `HeatmapOut`, `NeedsReviewItem`, `WordOfDayOut`.
  - `formatRelativeVi(iso: string | null): string` from `lib/format`.
  - `useProgressSummary()` (key `['progress','summary']`), `useHeatmap()` (`['progress','heatmap']`), `useNeedsReview()` (`['progress','needs-review']`), `useResetProgress()` (POST `/progress/reset`, invalidates progress/decks/review/cards/dashboard).
  - `useWordOfDay()` (`['dashboard','word-of-day']`, `retry:false`), `useRecentCards(limit?)` (`['cards','recent',limit]`).
  - Fixtures `progressSummaryFixture`, `heatmapFixture`, `needsReviewFixture`, `wordOfDayFixture`, `recentCardsFixture`.

- [ ] **Step 1: Add types to `frontend/src/lib/api-types.ts`** (append):

```ts
export interface MasteryCounts { new: number; learning: number; proficient: number }
export interface WeeklyBar { label: string; count: number }
export interface ProgressSummary {
  streak: number
  reviews_today: number
  mastery: MasteryCounts
  weekly_bars: WeeklyBar[]
  due_total: number
}
export interface HeatmapOut { cells: number[] }
export interface NeedsReviewItem { card_id: string; word: string; lapses: number }
export interface WordOfDayOut {
  card_id: string
  word: string
  phonetic: string
  pos: string
  meaning: string
  example: string
}
```

- [ ] **Step 2: Create `frontend/src/lib/format.ts`** (move the function out of `deck-view.ts`):

```ts
export function formatRelativeVi(iso: string | null): string {
  if (!iso) return 'chưa ôn'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'hôm nay'
  if (days === 1) return 'hôm qua'
  if (days < 7) return `${days} ngày trước`
  if (days < 30) return `${Math.floor(days / 7)} tuần trước`
  return `${Math.floor(days / 30)} tháng trước`
}
```

- [ ] **Step 3: Update `frontend/src/features/library/deck-view.ts`** — remove its local `formatRelativeVi` definition and import it instead. Change the top of the file:

```ts
import type { DeckOut } from '../../lib/api-types'
import type { DeckCardProps } from './DeckCard'
import { formatRelativeVi } from '../../lib/format'
```

Delete the `export function formatRelativeVi(...) { ... }` block from `deck-view.ts`. Re-export it so existing importers of `deck-view` still work:

```ts
export { formatRelativeVi } from '../../lib/format'
```

(`toDeckCard` is unchanged — it already calls `formatRelativeVi`.)

- [ ] **Step 4: Run the existing deck-view test to confirm the move didn't break it**

Run: `cd frontend && npx vitest run src/features/library/deck-view.test.ts`
Expected: PASS (the re-export keeps `import { formatRelativeVi } from './deck-view'` working).

- [ ] **Step 5: Add the fixtures to `frontend/src/test/fixtures.ts`** (append):

```ts
import type {
  ProgressSummary, HeatmapOut, NeedsReviewItem, WordOfDayOut, CardOut,
} from '../lib/api-types'

export const progressSummaryFixture: ProgressSummary = {
  streak: 12,
  reviews_today: 8,
  mastery: { new: 96, learning: 177, proficient: 213 },
  weekly_bars: [
    { label: 'T2', count: 5 }, { label: 'T3', count: 8 }, { label: 'T4', count: 4 },
    { label: 'T5', count: 9 }, { label: 'T6', count: 6 }, { label: 'T7', count: 2 }, { label: 'CN', count: 0 },
  ],
  due_total: 16,
}

export const heatmapFixture: HeatmapOut = { cells: Array.from({ length: 126 }, (_, i) => i % 4) }

export const needsReviewFixture: NeedsReviewItem[] = [
  { card_id: 'n1', word: 'much vs many', lapses: 4 },
  { card_id: 'n2', word: 'put off', lapses: 3 },
]

export const wordOfDayFixture: WordOfDayOut = {
  card_id: 'c2', word: 'serendipity', phonetic: '/ˌser.ənˈdɪp.ə.ti/', pos: 'noun',
  meaning: 'sự tình cờ may mắn; duyên may bất ngờ',
  example: 'Finding that little café was pure serendipity.',
}

export const recentCardsFixture: CardOut[] = [
  {
    id: 'c1', deck_id: 'd1', word: 'resilient', phonetic: '/rɪˈzɪl.i.ənt/', pos: 'adjective',
    meaning: 'có khả năng phục hồi nhanh', example: 'She is so resilient.',
    ease_factor: 2.5, interval_days: 0, repetitions: 0, lapses: 0,
    due_at: '2026-06-23T00:00:00Z', last_reviewed_at: null,
    created_at: '2026-06-23T00:00:00Z', updated_at: '2026-06-23T00:00:00Z',
  },
]
```

- [ ] **Step 6: Write the failing hook test `frontend/src/features/progress/queries.test.tsx`**

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useProgressSummary, useResetProgress } from './queries'
import { progressSummaryFixture } from '../../test/fixtures'
import { fakeResponse } from '../../test/fakeResponse'

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}
afterEach(() => { vi.restoreAllMocks() })

describe('progress queries', () => {
  it('useProgressSummary fetches /progress/summary', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => fakeResponse(progressSummaryFixture)))
    const { result } = renderHook(() => useProgressSummary(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.streak).toBe(12)
  })

  it('useResetProgress POSTs /progress/reset', async () => {
    const spy = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => fakeResponse({ reset: 5 }))
    vi.stubGlobal('fetch', spy)
    const { result } = renderHook(() => useResetProgress(), { wrapper: makeWrapper() })
    await result.current.mutateAsync()
    expect(String(spy.mock.calls[0][0])).toContain('/progress/reset')
    expect((spy.mock.calls[0][1] as RequestInit).method).toBe('POST')
  })
})
```

- [ ] **Step 7: Run it to verify it fails**

Run: `cd frontend && npx vitest run src/features/progress/queries.test.tsx`
Expected: FAIL — `Failed to resolve import './queries'`.

- [ ] **Step 8: Implement `frontend/src/features/progress/queries.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../lib/api'
import type { ProgressSummary, HeatmapOut, NeedsReviewItem } from '../../lib/api-types'

export function useProgressSummary() {
  return useQuery({ queryKey: ['progress', 'summary'], queryFn: () => apiGet<ProgressSummary>('/progress/summary') })
}

export function useHeatmap() {
  return useQuery({ queryKey: ['progress', 'heatmap'], queryFn: () => apiGet<HeatmapOut>('/progress/heatmap') })
}

export function useNeedsReview() {
  return useQuery({ queryKey: ['progress', 'needs-review'], queryFn: () => apiGet<NeedsReviewItem[]>('/progress/needs-review') })
}

export function useResetProgress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiPost<{ reset: number }>('/progress/reset'),
    onSuccess: () => {
      for (const key of [['progress'], ['decks'], ['review'], ['cards'], ['dashboard']]) {
        qc.invalidateQueries({ queryKey: key })
      }
    },
  })
}
```

- [ ] **Step 9: Implement `frontend/src/features/dashboard/queries.ts`**

```ts
import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../lib/api'
import type { WordOfDayOut, CardOut } from '../../lib/api-types'

export function useWordOfDay() {
  return useQuery({
    queryKey: ['dashboard', 'word-of-day'],
    queryFn: () => apiGet<WordOfDayOut>('/dashboard/word-of-day'),
    retry: false, // 404 on an empty DB — don't retry
  })
}

export function useRecentCards(limit = 3) {
  return useQuery({
    queryKey: ['cards', 'recent', limit],
    queryFn: () => apiGet<CardOut[]>(`/cards/recent?limit=${limit}`),
  })
}
```

- [ ] **Step 10: Run the hook test + full suite + build**

Run: `cd frontend && npx vitest run src/features/progress/queries.test.tsx && npm test && npm run build`
Expected: hook test passes (2); full suite passes; tsc build succeeds.

- [ ] **Step 11: Commit**

```bash
git add frontend/src/lib/api-types.ts frontend/src/lib/format.ts frontend/src/features/library/deck-view.ts frontend/src/test/fixtures.ts frontend/src/features/progress/queries.ts frontend/src/features/dashboard/queries.ts frontend/src/features/progress/queries.test.tsx
git commit -m "feat(frontend): progress/dashboard query hooks, types, fixtures, shared format util"
```

---

## Task 2: Wire the Progress screen

**Files:**
- Modify: `frontend/src/features/progress/ProgressScreen.tsx`, `Calendar.tsx`, `ReviewBars.tsx`, `MasteryLevels.tsx`, `NeedsReview.tsx`
- Modify (rewrite): `frontend/src/features/progress/progress.test.tsx`

**Interfaces:**
- Consumes: `useProgressSummary`/`useHeatmap`/`useNeedsReview` (Task 1), fixtures (Task 1), `renderWithProviders`/`fakeResponse`.

- [ ] **Step 1: Rewrite the test `frontend/src/features/progress/progress.test.tsx` (failing)**

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import ProgressScreen from './ProgressScreen'
import { useAppStore, initialState } from '../../store/useAppStore'
import { renderWithProviders } from '../../test/renderWithProviders'
import { progressSummaryFixture, heatmapFixture, needsReviewFixture } from '../../test/fixtures'
import { fakeResponse } from '../../test/fakeResponse'

function mockApi() {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/progress/summary')) return fakeResponse(progressSummaryFixture)
    if (url.includes('/progress/heatmap')) return fakeResponse(heatmapFixture)
    if (url.includes('/progress/needs-review')) return fakeResponse(needsReviewFixture)
    return fakeResponse({ detail: 'not mocked' }, 404)
  }))
}

function renderProgress() {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<ProgressScreen />} />
      <Route path="/review" element={<div>REVIEW PAGE</div>} />
    </Routes>,
  )
}

describe('ProgressScreen', () => {
  beforeEach(() => { localStorage.clear(); useAppStore.setState({ ...initialState }); mockApi() })
  afterEach(() => { vi.restoreAllMocks() })

  it('renders the streak stat tile from the API', async () => {
    renderProgress()
    expect(await screen.findByText('12')).toBeInTheDocument()
    expect(screen.getByText('ngày liên tục')).toBeInTheDocument()
  })

  it('needs-review CTA navigates to review', async () => {
    renderProgress()
    await userEvent.click(await screen.findByText('Ôn ngay nhóm này'))
    expect(screen.getByText('REVIEW PAGE')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npx vitest run src/features/progress/progress.test.tsx`
Expected: FAIL — ProgressScreen still renders the hardcoded tiles (`486`/`88%`/`1.640`) and isn't wrapped for async API data.

- [ ] **Step 3: Rewrite `frontend/src/features/progress/Calendar.tsx`** (swap seed for the heatmap query):

```tsx
import { useHeatmap } from './queries'

function heatColor(lv: number): string {
  if (lv === 0) return 'var(--track)'
  if (lv === 1) return 'color-mix(in srgb, var(--accent) 30%, #fff)'
  if (lv === 2) return 'color-mix(in srgb, var(--accent) 65%, #fff)'
  return 'var(--accent)'
}

export function Calendar() {
  const { data } = useHeatmap()
  const levels = data?.cells ?? Array.from({ length: 126 }, () => 0)
  return (
    <div>
      <h2 style={{ margin: '0 0 16px', fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 19 }}>
        Lịch học · 18 tuần qua
      </h2>
      <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 13px)', gridAutoFlow: 'column', gridAutoColumns: '13px', gap: 4 }}>
        {levels.map((lv, i) => (
          <div key={i} style={{ width: 13, height: 13, borderRadius: 3, background: heatColor(lv) }} />
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, fontSize: 12, color: 'var(--muted)' }}>
        ít
        <div style={{ width: 13, height: 13, borderRadius: 3, background: 'var(--track)' }} />
        <div style={{ width: 13, height: 13, borderRadius: 3, background: 'color-mix(in srgb, var(--accent) 30%, #fff)' }} />
        <div style={{ width: 13, height: 13, borderRadius: 3, background: 'color-mix(in srgb, var(--accent) 65%, #fff)' }} />
        <div style={{ width: 13, height: 13, borderRadius: 3, background: 'var(--accent)' }} />
        nhiều
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Rewrite `frontend/src/features/progress/ReviewBars.tsx`** (weekly_bars → normalized bar heights):

```tsx
import { useProgressSummary } from './queries'

export function ReviewBars() {
  const { data } = useProgressSummary()
  const bars = data?.weekly_bars ?? []
  const max = Math.max(1, ...bars.map((b) => b.count))
  return (
    <div style={{ marginTop: 26 }}>
      <h2 style={{ margin: '0 0 14px', fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 19 }}>
        Lượt ôn mỗi ngày · tuần này
      </h2>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 140 }}>
        {bars.map((b, i) => (
          <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{
              width: '100%',
              height: `${Math.round((b.count / max) * 100)}%`,
              borderRadius: '7px 7px 0 0',
              background: i < 5 ? 'var(--accent)' : 'transparent',
              border: i < 5 ? 'none' : '1.5px dashed var(--line)',
            }} />
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Rewrite `frontend/src/features/progress/MasteryLevels.tsx`** (mastery counts → rows + computed widths):

```tsx
import { useProgressSummary } from './queries'

const COLORS = ['var(--rust)', '#c9a23a', '#3f8f5b'] // Mới, Đang học, Thành thạo

export function MasteryLevels() {
  const { data } = useProgressSummary()
  const m = data?.mastery ?? { new: 0, learning: 0, proficient: 0 }
  const rows = [
    { label: 'Mới', n: m.new },
    { label: 'Đang học', n: m.learning },
    { label: 'Thành thạo', n: m.proficient },
  ]
  const total = Math.max(1, m.new + m.learning + m.proficient)
  return (
    <section style={{ border: '1px solid var(--line)', borderRadius: 18, background: 'var(--surface)', padding: 22, boxShadow: '0 1px 2px rgba(40,35,25,0.03)' }}>
      <h2 style={{ margin: '0 0 16px', fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 18 }}>Mức độ thành thạo</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map((m2, i) => (
          <div key={m2.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 5 }}>
              <span style={{ color: 'var(--ink)' }}>{m2.label}</span>
              <span style={{ color: 'var(--muted)' }}>{m2.n}</span>
            </div>
            <div style={{ height: 9, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.round((m2.n / total) * 100)}%`, height: '100%', background: COLORS[i], borderRadius: 999 }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 6: Rewrite `frontend/src/features/progress/NeedsReview.tsx`** (needs-review query → list, empty state):

```tsx
import { useNavigate } from 'react-router-dom'
import { useNeedsReview } from './queries'

export function NeedsReview() {
  const nav = useNavigate()
  const { data } = useNeedsReview()
  const items = data ?? []
  return (
    <section style={{ border: '1px solid var(--rust)', borderRadius: 18, background: 'var(--surface)', padding: 22, boxShadow: '0 1px 2px rgba(40,35,25,0.03)' }}>
      <h2 style={{ margin: '0 0 12px', fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 18, color: 'var(--rust)' }}>
        Cần ôn gấp
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 15 }}>
        {items.length === 0 && <span style={{ color: 'var(--muted)', fontSize: 14 }}>Chưa có thẻ nào cần ôn gấp.</span>}
        {items.map((n) => (
          <div key={n.card_id} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--ink)' }}>{n.word}</span>
            <span style={{ color: 'var(--rust)', fontSize: 13 }}>sai {n.lapses}×</span>
          </div>
        ))}
      </div>
      <button
        onClick={() => nav('/review')}
        style={{ marginTop: 16, width: '100%', border: 'none', borderRadius: 11, background: 'var(--rust)', color: '#fff', padding: 11, fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'transform .18s ease, box-shadow .18s ease' }}
        className="cta"
      >
        Ôn ngay nhóm này
      </button>
    </section>
  )
}
```

- [ ] **Step 7: Rewrite the 4 StatTiles in `frontend/src/features/progress/ProgressScreen.tsx`** (DECISION 2a)

Replace the imports/top and the StatTiles grid. The new top of the file:

```tsx
import { useT } from '../../i18n/useT'
import { Calendar } from './Calendar'
import { ReviewBars } from './ReviewBars'
import { MasteryLevels } from './MasteryLevels'
import { NeedsReview } from './NeedsReview'
import { useProgressSummary } from './queries'

export default function ProgressScreen() {
  const t = useT()
  const { data } = useProgressSummary()
  const s = data
```

Replace the `{/* 4 stat tiles */}` grid with API-backed tiles:

```tsx
      {/* 4 stat tiles (API-backed) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 22 }}>
        <StatTile value={String(s?.streak ?? 0)} label="ngày liên tục" color="var(--clay, #a96440)" />
        <StatTile value={String(s?.mastery.proficient ?? 0)} label="đã thành thạo" color="var(--accent)" />
        <StatTile value={String(s?.due_total ?? 0)} label="thẻ đến hạn" />
        <StatTile value={String(s?.reviews_today ?? 0)} label="ôn hôm nay" />
      </div>
```

(The rest of `ProgressScreen` — the two-column body and the `StatTile` helper component — is unchanged.)

- [ ] **Step 8: Run the Progress test, then the full suite + build**

Run: `cd frontend && npx vitest run src/features/progress/progress.test.tsx`
Expected: PASS (2 tests).

Run: `cd frontend && npm test && npm run build`
Expected: all pass; tsc green.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/features/progress/
git commit -m "feat(frontend): wire Progress screen to the API (heatmap, bars, mastery, needs-review, 2a tiles)"
```

---

## Task 3: Wire the Dashboard screen

**Files:**
- Modify: `frontend/src/features/dashboard/TodaySession.tsx`, `Streak.tsx`, `WeekProgress.tsx`, `WordOfDay.tsx`, `RecentlyAdded.tsx`
- Modify (rewrite): `frontend/src/features/dashboard/dashboard.test.tsx`
- Modify: `frontend/src/components/layout/layout.test.tsx` (App renders the Dashboard route, which now needs a QueryClient + mocked fetch)

**Interfaces:**
- Consumes: `useProgressSummary` (Task 1), `useWordOfDay`/`useRecentCards` (Task 1), `formatRelativeVi` (`lib/format`), fixtures, `renderWithProviders`/`fakeResponse`.

- [ ] **Step 1: Rewrite the test `frontend/src/features/dashboard/dashboard.test.tsx` (failing)**

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import DashboardScreen from './DashboardScreen'
import { useAppStore, initialState } from '../../store/useAppStore'
import { renderWithProviders } from '../../test/renderWithProviders'
import { progressSummaryFixture, wordOfDayFixture, recentCardsFixture } from '../../test/fixtures'
import { fakeResponse } from '../../test/fakeResponse'

function mockApi() {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/progress/summary')) return fakeResponse(progressSummaryFixture)
    if (url.includes('/dashboard/word-of-day')) return fakeResponse(wordOfDayFixture)
    if (url.includes('/cards/recent')) return fakeResponse(recentCardsFixture)
    return fakeResponse({ detail: 'not mocked' }, 404)
  }))
}

function renderDashboard() {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<DashboardScreen />} />
      <Route path="/review" element={<div>REVIEW PAGE</div>} />
    </Routes>,
  )
}

describe('DashboardScreen', () => {
  beforeEach(() => { localStorage.clear(); useAppStore.setState({ ...initialState }); mockApi() })
  afterEach(() => { vi.restoreAllMocks() })

  it('renders the word of day and due count from the API', async () => {
    renderDashboard()
    expect(await screen.findByText('serendipity')).toBeInTheDocument()
    expect(screen.getByText('/24')).toBeInTheDocument() // ring: reviews_today 8 / (8 + due 16)
  })

  it('start review navigates to /review', async () => {
    renderDashboard()
    await userEvent.click(await screen.findByText('Bắt đầu ôn tập'))
    expect(screen.getByText('REVIEW PAGE')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npx vitest run src/features/dashboard/dashboard.test.tsx`
Expected: FAIL — widgets are still hardcoded/seed and the screen isn't wrapped for async data; `findByText('serendipity')` only resolves once `WordOfDay` reads the query.

- [ ] **Step 3: Rewrite `frontend/src/features/dashboard/TodaySession.tsx`** (ring + due from summary; drop the no-data category chips + time estimate):

```tsx
import { useNavigate } from 'react-router-dom'
import { useT } from '../../i18n/useT'
import { useProgressSummary } from './queries'

const CIRC = 2 * Math.PI * 60 // r=60

export function TodaySession() {
  const t = useT()
  const nav = useNavigate()
  const { data } = useProgressSummary()
  const reviewed = data?.reviews_today ?? 0
  const due = data?.due_total ?? 0
  const target = reviewed + due
  const offset = target > 0 ? CIRC * (1 - reviewed / target) : CIRC

  return (
    <section style={{ flex: '1.7', minWidth: '420px', border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--surface)', padding: '30px', display: 'flex', gap: '32px', alignItems: 'center', boxShadow: '0 1px 2px rgba(40,35,25,0.03)', animation: 'fadeUp .6s ease both', animationDelay: '.05s' }}>
      <div style={{ position: 'relative', width: '144px', height: '144px', flex: 'none' }}>
        <svg width="144" height="144" viewBox="0 0 144 144">
          <circle cx="72" cy="72" r="60" fill="none" stroke="var(--line,#e8e3d8)" strokeWidth="11" />
          <circle cx="72" cy="72" r="60" fill="none" stroke="var(--accent,#2f5d4e)" strokeWidth="11" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={offset} transform="rotate(-90 72 72)" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'var(--num-font)', fontSize: '34px', fontWeight: 600, lineHeight: 1 }}>{reviewed}<span style={{ color: 'var(--muted)', fontSize: '20px' }}>/{target}</span></div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '3px' }}>đã ôn</div>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '7px' }}>{t.todaySession}</div>
        <div style={{ fontFamily: "'Newsreader',serif", fontSize: '27px', fontWeight: 500, letterSpacing: '-0.01em', marginBottom: '20px' }}>Còn {due} thẻ đến hạn</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => nav('/review')}
            style={{ border: 'none', borderRadius: '11px', background: 'var(--accent,#2f5d4e)', color: '#fff', padding: '13px 26px', fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: '15px', cursor: 'pointer', transition: 'transform .18s ease, box-shadow .18s ease', display: 'flex', alignItems: 'center', gap: '9px' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3 2.2v9.6a.5.5 0 0 0 .76.43l7.7-4.8a.5.5 0 0 0 0-.86l-7.7-4.8A.5.5 0 0 0 3 2.2z" /></svg>
            {t.startReview}
          </button>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Rewrite `frontend/src/features/dashboard/Streak.tsx`** (streak + weekly_bars → chips):

```tsx
import { useProgressSummary } from './queries'

export function Streak() {
  const { data } = useProgressSummary()
  const streak = data?.streak ?? 0
  const bars = data?.weekly_bars ?? []
  const todayIdx = (new Date().getDay() + 6) % 7 // Mon=0 .. Sun=6
  const chips = bars.map((b, i) => ({ label: b.label, filled: b.count > 0, today: i === todayIdx }))

  return (
    <section style={{ flex: 1, minWidth: '280px', border: '1px solid var(--line)', borderRadius: '18px', background: 'linear-gradient(165deg,#fdfaf2,var(--surface))', padding: '26px', boxShadow: '0 1px 2px rgba(40,35,25,0.03)', animation: 'fadeUp .6s ease both', animationDelay: '.12s' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>Chuỗi học</div>
        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'color-mix(in srgb, var(--clay) 16%, #fff)', color: 'var(--clay)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>◆</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '18px' }}>
        <div style={{ fontFamily: 'var(--num-font)', fontSize: '52px', fontWeight: 600, lineHeight: 1, color: 'var(--clay)' }}>{streak}</div>
        <div style={{ fontSize: '16px', color: 'var(--muted)' }}>ngày liên tục</div>
      </div>
      <div style={{ display: 'flex', gap: '7px', justifyContent: 'space-between' }}>
        {chips.map(({ label, filled, today }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={today
              ? { width: '26px', height: '26px', borderRadius: '7px', border: '1.5px dashed var(--accent,#2f5d4e)', background: 'var(--surface)' }
              : filled
                ? { width: '26px', height: '26px', borderRadius: '7px', background: 'var(--accent,#2f5d4e)' }
                : { width: '26px', height: '26px', borderRadius: '7px', background: 'var(--track)' }
            } />
            <div style={{ fontSize: '11px', color: today ? 'var(--accent,#2f5d4e)' : 'var(--muted)', marginTop: '5px', fontWeight: today ? 600 : undefined }}>{label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Rewrite `frontend/src/features/dashboard/WeekProgress.tsx`** (mastery + weekly_bars):

```tsx
import { useProgressSummary } from './queries'

export function WeekProgress() {
  const { data } = useProgressSummary()
  const m = data?.mastery ?? { new: 0, learning: 0, proficient: 0 }
  const learned = m.learning + m.proficient
  const bars = data?.weekly_bars ?? []
  const daysActive = bars.filter((b) => b.count > 0).length
  const weekPct = Math.round((daysActive / 7) * 100)

  return (
    <>
      <div style={{ display: 'flex', gap: '14px', animation: 'fadeUp .6s ease both', animationDelay: '.36s' }}>
        <section style={{ flex: 1, border: '1px solid var(--line)', borderRadius: '16px', background: 'var(--surface)', padding: '18px', textAlign: 'center', boxShadow: '0 1px 2px rgba(40,35,25,0.03)' }}>
          <div style={{ fontFamily: 'var(--num-font)', fontSize: '34px', fontWeight: 600, lineHeight: 1 }}>{learned}</div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '5px' }}>thẻ đã học</div>
        </section>
        <section style={{ flex: 1, border: '1px solid var(--line)', borderRadius: '16px', background: 'var(--surface)', padding: '18px', textAlign: 'center', boxShadow: '0 1px 2px rgba(40,35,25,0.03)' }}>
          <div style={{ fontFamily: 'var(--num-font)', fontSize: '34px', fontWeight: 600, lineHeight: 1, color: 'var(--accent,#2f5d4e)' }}>{m.proficient}</div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '5px' }}>đã thành thạo</div>
        </section>
      </div>

      <section style={{ border: '1px solid var(--line)', borderRadius: '16px', background: 'var(--surface)', padding: '18px 20px', animation: 'fadeUp .6s ease both', animationDelay: '.42s', boxShadow: '0 1px 2px rgba(40,35,25,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600 }}>Tiến độ tuần</div>
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>{weekPct}%</div>
        </div>
        <div style={{ height: '8px', borderRadius: '999px', background: 'var(--track)', overflow: 'hidden' }}>
          <div style={{ width: `${weekPct}%`, height: '100%', background: 'var(--accent,#2f5d4e)', borderRadius: '999px' }} />
        </div>
        <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '9px' }}>Số ngày đã học tuần này: {daysActive}/7</div>
      </section>
    </>
  )
}
```

- [ ] **Step 6: Rewrite `frontend/src/features/dashboard/WordOfDay.tsx`** (word-of-day query, 404 placeholder):

```tsx
import { useWordOfDay } from './queries'

export function WordOfDay() {
  const { data } = useWordOfDay()
  const phon = data ? [data.phonetic, data.pos].filter(Boolean).join(' · ') : ''
  return (
    <section style={{ border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--surface)', padding: '24px', boxShadow: '0 1px 2px rgba(40,35,25,0.03)', animation: 'fadeUp .6s ease both', animationDelay: '.3s' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>Từ của ngày</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--accent,#2f5d4e)', border: '1px solid var(--accent-soft,#e9f0ec)', background: 'var(--accent-soft,#e9f0ec)', borderRadius: '999px', padding: '4px 10px', cursor: 'pointer' }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><path d="M3 2v8l6-4z" /></svg>
          Nghe
        </div>
      </div>
      {data ? (
        <>
          <div style={{ fontFamily: "'Newsreader',serif", fontSize: '34px', fontWeight: 500, letterSpacing: '-0.01em' }}>{data.word}</div>
          <div style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--muted)', margin: '3px 0 10px' }}>{phon}</div>
          <div style={{ fontSize: '15px', color: 'var(--ink)' }}>{data.meaning}</div>
          <div style={{ fontSize: '14px', color: 'var(--muted)', fontStyle: 'italic', marginTop: '12px', paddingLeft: '13px', borderLeft: '2px solid var(--accent,#2f5d4e)' }}>{data.example}</div>
        </>
      ) : (
        <div style={{ fontSize: '14px', color: 'var(--muted)' }}>Chưa có thẻ nào — thêm thẻ để bắt đầu.</div>
      )}
    </section>
  )
}
```

- [ ] **Step 7: Rewrite `frontend/src/features/dashboard/RecentlyAdded.tsx`** (cards/recent → list):

```tsx
import { useRecentCards } from './queries'
import { formatRelativeVi } from '../../lib/format'

const tagStyle: React.CSSProperties = {
  fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase',
  color: 'var(--accent,#2f5d4e)', background: 'var(--accent-soft,#e9f0ec)',
  borderRadius: '6px', padding: '4px 8px', fontWeight: 600, flex: 'none', marginTop: '2px',
}

export function RecentlyAdded() {
  const { data } = useRecentCards()
  const items = data ?? []
  return (
    <section style={{ flex: '1.5', minWidth: '380px', border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--surface)', padding: '24px', boxShadow: '0 1px 2px rgba(40,35,25,0.03)', animation: 'fadeUp .6s ease both', animationDelay: '.24s' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <h2 style={{ margin: 0, fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: '20px' }}>Đã thêm gần đây</h2>
        <span style={{ fontSize: '13px', color: 'var(--accent,#2f5d4e)', cursor: 'pointer' }}>Xem tất cả →</span>
      </div>
      {items.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 14, padding: '16px 0' }}>Chưa có thẻ nào.</div>}
      {items.map((c, i) => (
        <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px 0', borderBottom: i < items.length - 1 ? '1px solid var(--line)' : undefined }}>
          <span style={tagStyle}>Từ vựng</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '16px' }}>
              {c.word}
              {c.phonetic && <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--muted)', fontWeight: 400 }}> {c.phonetic}</span>}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '2px' }}>{c.meaning}</div>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--muted)', flex: 'none' }}>{formatRelativeVi(c.created_at)}</span>
        </div>
      ))}
    </section>
  )
}
```

- [ ] **Step 8: Run the Dashboard test**

Run: `cd frontend && npx vitest run src/features/dashboard/dashboard.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 9: Fix `frontend/src/components/layout/layout.test.tsx`** — App now renders the Dashboard route (which uses query hooks + fetch), so wrap App in providers and mock the dashboard fetches. Full file:

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App'
import { useAppStore, initialState } from '../../store/useAppStore'
import { renderWithProviders } from '../../test/renderWithProviders'
import { progressSummaryFixture, wordOfDayFixture, recentCardsFixture } from '../../test/fixtures'
import { fakeResponse } from '../../test/fakeResponse'

function mockApi() {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/progress/summary')) return fakeResponse(progressSummaryFixture)
    if (url.includes('/dashboard/word-of-day')) return fakeResponse(wordOfDayFixture)
    if (url.includes('/cards/recent')) return fakeResponse(recentCardsFixture)
    return fakeResponse([], 200)
  }))
}

describe('layout', () => {
  beforeEach(() => { localStorage.clear(); useAppStore.setState({ ...initialState }); mockApi() })
  afterEach(() => { vi.restoreAllMocks() })

  it('shows Snoopify brand', () => {
    renderWithProviders(<App />)
    expect(screen.getByText('Snoopify')).toBeInTheDocument()
  })
  it('settings trigger opens panel with dark toggle', async () => {
    renderWithProviders(<App />)
    await userEvent.click(screen.getByLabelText('Cài đặt'))
    expect(screen.getByText('Chế độ tối')).toBeInTheDocument()
  })
  it('reset requires confirm step', async () => {
    useAppStore.setState({ settingsOpen: true })
    renderWithProviders(<App />)
    await userEvent.click(screen.getByText('Đặt lại tiến độ'))
    expect(screen.getByText('Xoá hết')).toBeInTheDocument()
  })
})
```

- [ ] **Step 10: Run the full suite + build**

Run: `cd frontend && npm test && npm run build`
Expected: all pass; tsc green.

- [ ] **Step 11: Commit**

```bash
git add frontend/src/features/dashboard/ frontend/src/components/layout/layout.test.tsx
git commit -m "feat(frontend): wire Dashboard screen to the API + fix layout test providers"
```

---

## Task 4: Wire Settings "reset progress" to the API

**Files:**
- Modify: `frontend/src/components/layout/SettingsPanel.tsx`
- Modify: `frontend/src/components/layout/layout.test.tsx`

**Interfaces:**
- Consumes: `useResetProgress` (Task 1); the existing store `resetProgress` (UI reset).

- [ ] **Step 1: Add a failing assertion to `frontend/src/components/layout/layout.test.tsx`** — append this test inside the `describe('layout', ...)` block:

```tsx
  it('confirming reset POSTs /progress/reset', async () => {
    useAppStore.setState({ settingsOpen: true, confirmReset: true })
    renderWithProviders(<App />)
    await userEvent.click(screen.getByText('Xoá hết'))
    await vi.waitFor(() => {
      const calls = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls
      const posted = calls.some((c) =>
        String(c[0]).includes('/progress/reset') && ((c[1] as RequestInit | undefined)?.method ?? 'GET') === 'POST')
      expect(posted).toBe(true)
    })
  })
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npx vitest run src/components/layout/layout.test.tsx`
Expected: FAIL — clicking "Xoá hết" only calls the store `resetProgress` (UI); nothing POSTs to `/progress/reset`.

- [ ] **Step 3: Wire `frontend/src/components/layout/SettingsPanel.tsx`** — add the mutation and call it on confirm. Change the imports + hook usage at the top:

```tsx
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import { useResetProgress } from '../../features/progress/queries'

export function SettingsPanel() {
  const t = useT()
  const { settingsOpen, dark, confirmReset } = useAppStore((s) => ({
    settingsOpen: s.settingsOpen,
    dark: s.dark,
    confirmReset: s.confirmReset,
  }))
  const setPanel = useAppStore((s) => s.setPanel)
  const toggleDark = useAppStore((s) => s.toggleDark)
  const resetProgress = useAppStore((s) => s.resetProgress)
  const resetMutation = useResetProgress()

  const handleReset = () => {
    resetMutation.mutate()   // server: wipe logs + reset schedules, invalidate queries
    resetProgress()          // UI: reset session counters + close panels
  }
```

Then change the "Xoá hết" (deleteAll) button's `onClick` from `() => resetProgress()` to `handleReset`:

```tsx
              <button
                onClick={handleReset}
```

(Everything else in `SettingsPanel` — the dark toggle, the confirm/cancel layout — is unchanged.)

- [ ] **Step 4: Run the layout test, then the full suite + build**

Run: `cd frontend && npx vitest run src/components/layout/layout.test.tsx`
Expected: PASS (4 tests).

Run: `cd frontend && npm test && npm run build`
Expected: all pass; tsc green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/SettingsPanel.tsx frontend/src/components/layout/layout.test.tsx
git commit -m "feat(frontend): Settings reset POSTs /progress/reset and invalidates caches"
```

---

## Self-Review

**Spec coverage (requirement → task):**
- Progress hooks + types + reset + shared format util + fixtures → Task 1. ✓
- Progress screen: Calendar (heatmap), ReviewBars (weekly_bars), MasteryLevels (mastery), NeedsReview (needs-review), 4 StatTiles 2a → Task 2. ✓
- Dashboard: TodaySession (summary), Streak (summary), WeekProgress (summary), WordOfDay (word-of-day + 404 placeholder), RecentlyAdded (cards/recent) → Task 3. ✓
- `layout.test.tsx` ripple (App renders Dashboard hooks) → fixed in Task 3 (providers + mocked fetch). ✓
- Settings reset → `/progress/reset` + invalidate-all → Task 4. ✓
- 2a (drop accuracy / all-time reviews tiles) → Task 2 tiles use streak/proficient/due/reviews_today only. ✓
- `useWordOfDay` `retry:false` + placeholder for the 404 empty-DB case → Tasks 1 + 3. ✓

**Placeholder scan:** No TBD/TODO; complete code in every code step; exact commands + expected output. ✓

**Type consistency:** `ProgressSummary`/`MasteryCounts`/`WeeklyBar`/`HeatmapOut`/`NeedsReviewItem`/`WordOfDayOut` (Task 1) match the backend `progress.py`/`card.py` schemas. `useProgressSummary`/`useHeatmap`/`useNeedsReview`/`useResetProgress`/`useWordOfDay`/`useRecentCards` names match their widget call sites (Tasks 2–4). `formatRelativeVi` moved to `lib/format` and re-exported from `deck-view` (Task 1) so group 1's `toDeckCard` and the new `RecentlyAdded` both resolve it. Fixtures (Task 1) used by Tasks 2–4 tests. ✓

**Notes (carry to final review):** TodaySession drops the per-type category chips ("18 từ vựng…") and the time estimate — no API data backs them. RecentlyAdded uses a fixed "Từ vựng" tag (CardOut has no card-type). The dashboard date header ("Thứ Hai · 22 tháng 6") in `DashboardScreen.tsx` stays hardcoded (cosmetic; out of scope). Accuracy / all-time review tiles are intentionally gone (2a).
