# Snoopify Library + JSON Import + Store Trim — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Library screen + JSON import to the real API (with rich per-deck stats), and trim the now-dead server-state out of the Zustand store.

**Architecture:** Follow-up Plan 1 of the FE↔BE integration, on branch `feat/frontend-integration`, building on the existing harness (`lib/api.ts`, React Query, `src/test/renderWithProviders.tsx`/`fakeResponse`/`fixtures.ts`, per-feature `queries.ts`). A small backend change rides along (per-deck `mastery_pct` + `last_reviewed_at` on `DeckOut`, computed in `list_decks`). Imported decks become real DB decks, so the store's `importedDecks` seam is removed.

**Tech Stack:** Backend: FastAPI + SQLAlchemy async + pytest. Frontend: React 18, Vite, TypeScript, Zustand, `@tanstack/react-query` v5, Vitest.

## Global Constraints

- **Branch:** `feat/frontend-integration`.
- FE always calls relative `/api/*`; server-state → React Query, UI-state → Zustand. TanStack Query v5 object syntax.
- **Import endpoint is special:** `POST /decks/import` returns `{ok, msg, deck?}` for BOTH 200 and 400 (NOT the standard `{detail}`). Do **not** route it through the throwing `apiPost`; read its body on any status.
- Backend `srs.mastery(repetitions, interval_days) -> "new" | "learning" | "proficient"` (reuse it; do not re-derive thresholds).
- `mastery_pct` = percentage of a deck's cards that are `proficient`, `round(...,1)`, `0.0` for an empty deck. `last_reviewed_at` = `max(cards.last_reviewed_at)` or `None`.
- Keep `npm run build` (tsc -b) green and the full Vitest suite passing. Backend: `uv run pytest` green.
- UI copy stays Vietnamese. DRY, YAGNI, TDD, commit per task.
- Out of scope: Add/QuickAdd (Plan 2); Dashboard/Progress/Settings-reset (Plan 3). The server-side progress reset is NOT wired here — `resetProgress` stays UI-only.

---

## File Structure

**Backend (Task 1):**
- Modify `backend/app/schemas/deck.py` — add `mastery_pct` + `last_reviewed_at` to `DeckOut`.
- Modify `backend/app/services/decks.py` — compute them in `_to_out`.
- Modify `backend/tests/api/test_decks.py` — assert the new fields.

**Frontend foundation (Task 2):**
- Modify `frontend/src/lib/api.ts` — export `API_BASE`.
- Modify `frontend/src/lib/api-types.ts` — add `DeckOut`, `ImportResult`.
- Create `frontend/src/features/library/queries.ts` — `useDecks`, `useCreateDeck`, `useImportDeck`.
- Create `frontend/src/features/library/deck-view.ts` — `toDeckCard`, `formatRelativeVi`.
- Create `frontend/src/features/library/deck-view.test.ts`.
- Modify `frontend/src/test/fixtures.ts` — add `decksFixture`.

**Frontend Library UI (Task 3):**
- Modify `frontend/src/features/library/LibraryScreen.tsx`, `DeckList.tsx`, `ImportJsonModal.tsx`.
- Modify `frontend/src/features/library/library.test.tsx`.

**Frontend store trim (Task 4):**
- Modify `frontend/src/store/useAppStore.ts`, `frontend/src/store/types.ts`.
- Modify `frontend/src/store/useAppStore.test.ts`.

---

## Task 1: Backend — per-deck `mastery_pct` + `last_reviewed_at`

**Files:**
- Modify: `backend/app/schemas/deck.py`
- Modify: `backend/app/services/decks.py`
- Test: `backend/tests/api/test_decks.py`

**Interfaces:**
- Produces: `DeckOut` gains `mastery_pct: float` and `last_reviewed_at: datetime | None`. The FE `DeckOut` type (Task 2) mirrors this.

- [ ] **Step 1: Extend the backend test `backend/tests/api/test_decks.py`** — append this test:

```python
async def test_list_decks_includes_mastery_and_last_reviewed(client):
    r = await client.post("/decks", json={"name": "Mastery", "topic": "t"})
    did = r.json()["id"]
    # create response already carries the new fields
    assert r.json()["mastery_pct"] == 0.0
    assert r.json()["last_reviewed_at"] is None

    # one brand-new card: 1 card, 0 proficient -> 0.0%, never reviewed
    await client.post(f"/decks/{did}/cards", json={"word": "w"})
    r = await client.get("/decks")
    d = next(x for x in r.json() if x["id"] == did)
    assert d["count"] == 1
    assert d["mastery_pct"] == 0.0
    assert d["last_reviewed_at"] is None
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd backend && uv run pytest tests/api/test_decks.py::test_list_decks_includes_mastery_and_last_reviewed -q`
Expected: FAIL — `KeyError: 'mastery_pct'` (field not in response).

- [ ] **Step 3: Add the fields to `backend/app/schemas/deck.py`**

Change `DeckOut` to:

```python
class DeckOut(BaseModel):
    id: uuid.UUID
    name: str
    topic: str
    count: int
    due_count: int
    mastery_pct: float
    last_reviewed_at: datetime | None
    created_at: datetime
    updated_at: datetime
```

(`DeckDetailOut(DeckOut)` and `DeckCreate`/`DeckUpdate` are unchanged.)

- [ ] **Step 4: Compute them in `backend/app/services/decks.py`**

Add the import near the top:

```python
from app.services.srs import mastery
```

Replace `_to_out` with:

```python
def _to_out(deck: Deck, now: datetime) -> DeckOut:
    cards = deck.cards
    total = len(cards)
    proficient = sum(1 for c in cards if mastery(c.repetitions, c.interval_days) == "proficient")
    mastery_pct = round(proficient / total * 100.0, 1) if total else 0.0
    reviewed = [c.last_reviewed_at for c in cards if c.last_reviewed_at is not None]
    last_reviewed_at = max(reviewed) if reviewed else None
    return DeckOut(
        id=deck.id,
        name=deck.name,
        topic=deck.topic,
        count=total,
        due_count=_due_count(deck, now),
        mastery_pct=mastery_pct,
        last_reviewed_at=last_reviewed_at,
        created_at=deck.created_at,
        updated_at=deck.updated_at,
    )
```

- [ ] **Step 5: Run the new test + the full decks suite**

Run: `cd backend && uv run pytest tests/api/test_decks.py -q`
Expected: PASS (all tests, including the existing create/list/update which still see `count`/`due_count`).

- [ ] **Step 6: Run the whole backend suite to confirm no regression**

Run: `cd backend && uv run pytest -q`
Expected: all pass (the extra `DeckOut` fields don't break other tests).

- [ ] **Step 7: Commit**

```bash
git add backend/app/schemas/deck.py backend/app/services/decks.py backend/tests/api/test_decks.py
git commit -m "feat(backend): per-deck mastery_pct + last_reviewed_at on DeckOut"
```

---

## Task 2: Frontend foundation — types, hooks, deck adapter, fixture

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/lib/api-types.ts`
- Create: `frontend/src/features/library/queries.ts`
- Create: `frontend/src/features/library/deck-view.ts`
- Create: `frontend/src/features/library/deck-view.test.ts`
- Modify: `frontend/src/test/fixtures.ts`

**Interfaces:**
- Consumes: `apiGet`/`apiPost` (lib/api), `DeckCardProps` (features/library/DeckCard), `fakeResponse` (test/fakeResponse).
- Produces:
  - `API_BASE: string` from `lib/api.ts`.
  - `DeckOut`, `ImportResult` types from `lib/api-types.ts`.
  - `useDecks()` → `data: DeckOut[]` (key `['decks']`); `useCreateDeck()` (POST `/decks`); `useImportDeck()` (POST `/decks/import`, returns `ImportResult` on any status) — both invalidate `['decks']` on success.
  - `toDeckCard(d: DeckOut): DeckCardProps`; `formatRelativeVi(iso: string | null): string`.
  - `decksFixture: DeckOut[]`.

- [ ] **Step 1: Export `API_BASE` from `frontend/src/lib/api.ts`**

Change the first line from `const BASE = ...` to an exported const, and update `request` to use it:

```ts
export const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api'
```

Then in `request`, change `fetch(`${BASE}${path}`` to `fetch(`${API_BASE}${path}`. (Everything else in `api.ts` is unchanged.)

- [ ] **Step 2: Add types to `frontend/src/lib/api-types.ts`** (append):

```ts
export interface DeckOut {
  id: string
  name: string
  topic: string
  count: number
  due_count: number
  mastery_pct: number
  last_reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface ImportResult {
  ok: boolean
  msg: string
  deck?: DeckOut
}
```

- [ ] **Step 3: Add `decksFixture` to `frontend/src/test/fixtures.ts`** (append):

```ts
import type { DeckOut } from '../lib/api-types'

export const decksFixture: DeckOut[] = [
  {
    id: 'd1', name: 'Bộ thẻ khởi động', topic: 'từ vựng', count: 5, due_count: 5,
    mastery_pct: 0, last_reviewed_at: null,
    created_at: '2026-06-20T00:00:00Z', updated_at: '2026-06-20T00:00:00Z',
  },
  {
    id: 'd2', name: 'Business English', topic: 'chủ đề', count: 92, due_count: 12,
    mastery_pct: 72, last_reviewed_at: '2026-06-21T00:00:00Z',
    created_at: '2026-06-10T00:00:00Z', updated_at: '2026-06-21T00:00:00Z',
  },
]
```

- [ ] **Step 4: Write the failing adapter test `frontend/src/features/library/deck-view.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { toDeckCard, formatRelativeVi } from './deck-view'
import type { DeckOut } from '../../lib/api-types'

const base: DeckOut = {
  id: 'd1', name: 'Business English', topic: 'chủ đề', count: 92, due_count: 12,
  mastery_pct: 72, last_reviewed_at: null,
  created_at: '2026-06-10T00:00:00Z', updated_at: '2026-06-10T00:00:00Z',
}

describe('toDeckCard', () => {
  it('maps counts, mastery and bar width', () => {
    const c = toDeckCard(base)
    expect(c.name).toBe('Business English')
    expect(c.meta).toBe('92 thẻ · 12 đến hạn')
    expect(c.mastery).toBe('thành thạo 72%')
    expect(c.barW).toBe('72%')
    expect(c.tag).toBe('chủ đề')
    expect(c.needAttention).toBe(false)
  })
  it('flags low-mastery decks as needing attention', () => {
    const c = toDeckCard({ ...base, mastery_pct: 20 })
    expect(c.needAttention).toBe(true)
    expect(c.tag).toBe('cần chú ý')
  })
  it('shows "chưa ôn" when never reviewed', () => {
    expect(toDeckCard(base).last).toBe('chưa ôn')
  })
})

describe('formatRelativeVi', () => {
  it('returns chưa ôn for null', () => { expect(formatRelativeVi(null)).toBe('chưa ôn') })
  it('formats days/weeks ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString()
    expect(formatRelativeVi(threeDaysAgo)).toBe('3 ngày trước')
    const twoWeeksAgo = new Date(Date.now() - 14 * 86_400_000).toISOString()
    expect(formatRelativeVi(twoWeeksAgo)).toBe('2 tuần trước')
  })
})
```

- [ ] **Step 5: Run it to verify it fails**

Run: `cd frontend && npx vitest run src/features/library/deck-view.test.ts`
Expected: FAIL — `Failed to resolve import './deck-view'`.

- [ ] **Step 6: Implement `frontend/src/features/library/deck-view.ts`**

```ts
import type { DeckOut } from '../../lib/api-types'
import type { DeckCardProps } from './DeckCard'

export function formatRelativeVi(iso: string | null): string {
  if (!iso) return 'chưa ôn'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'hôm nay'
  if (days === 1) return 'hôm qua'
  if (days < 7) return `${days} ngày trước`
  if (days < 30) return `${Math.floor(days / 7)} tuần trước`
  return `${Math.floor(days / 30)} tháng trước`
}

export function toDeckCard(d: DeckOut): DeckCardProps {
  const pct = Math.round(d.mastery_pct)
  const needAttention = d.count > 0 && pct < 40
  return {
    name: d.name,
    tag: needAttention ? 'cần chú ý' : (d.topic || 'chủ đề'),
    meta: `${d.count} thẻ · ${d.due_count} đến hạn`,
    mastery: `thành thạo ${pct}%`,
    last: formatRelativeVi(d.last_reviewed_at),
    barW: `${pct}%`,
    needAttention,
  }
}
```

- [ ] **Step 7: Run the adapter test to verify it passes**

Run: `cd frontend && npx vitest run src/features/library/deck-view.test.ts`
Expected: PASS (6 assertions across the cases).

- [ ] **Step 8: Implement `frontend/src/features/library/queries.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, API_BASE } from '../../lib/api'
import type { DeckOut, ImportResult } from '../../lib/api-types'

export function useDecks() {
  return useQuery({
    queryKey: ['decks'],
    queryFn: () => apiGet<DeckOut[]>('/decks'),
  })
}

export function useCreateDeck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; topic?: string }) => apiPost<DeckOut>('/decks', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['decks'] }),
  })
}

// /decks/import returns {ok,msg,deck?} for BOTH 200 and 400, so read the body
// on any status rather than throwing through apiPost.
export function useImportDeck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: unknown): Promise<ImportResult> => {
      const res = await fetch(`${API_BASE}/decks/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      return (await res.json()) as ImportResult
    },
    onSuccess: (result) => {
      if (result.ok) qc.invalidateQueries({ queryKey: ['decks'] })
    },
  })
}
```

- [ ] **Step 9: Verify build + full suite still green**

Run: `cd frontend && npm run build && npm test`
Expected: tsc build succeeds; all tests pass (new adapter tests included).

- [ ] **Step 10: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/lib/api-types.ts frontend/src/features/library/queries.ts frontend/src/features/library/deck-view.ts frontend/src/features/library/deck-view.test.ts frontend/src/test/fixtures.ts
git commit -m "feat(frontend): deck types, library query hooks, deck-card adapter"
```

---

## Task 3: Frontend — wire Library screen + DeckList + Import to the API

Changes the three Library components together (they share the removal of the `seedDecks`/`store.importedDecks`/`parseAndImport` seams) and rewrites `library.test.tsx` against a mocked API.

**Files:**
- Modify: `frontend/src/features/library/LibraryScreen.tsx`
- Modify: `frontend/src/features/library/DeckList.tsx`
- Modify: `frontend/src/features/library/ImportJsonModal.tsx`
- Modify (rewrite): `frontend/src/features/library/library.test.tsx`

**Interfaces:**
- Consumes: `useDecks`/`useCreateDeck`/`useImportDeck` (Task 2), `toDeckCard` (Task 2), `decksFixture`/`fakeResponse` (test), `renderWithProviders` (existing), `ImportStatus` (store types — still exported after Task 4).

- [ ] **Step 1: Rewrite the test `frontend/src/features/library/library.test.tsx` (failing)**

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LibraryScreen from './LibraryScreen'
import { useAppStore, initialState } from '../../store/useAppStore'
import { renderWithProviders } from '../../test/renderWithProviders'
import { decksFixture } from '../../test/fixtures'
import { fakeResponse } from '../../test/fakeResponse'
import type { DeckOut } from '../../lib/api-types'

function mockApi(decksRef: { current: DeckOut[] }) {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = (init?.method ?? 'GET').toUpperCase()
    if (url.includes('/decks/import') && method === 'POST') {
      const body = JSON.parse(String(init?.body ?? '{}'))
      const cards = Array.isArray(body.cards) ? body.cards : []
      if (!body.deck || cards.length === 0) {
        return fakeResponse({ ok: false, msg: 'JSON không hợp lệ hoặc thiếu trường bắt buộc (deck, cards[].word).' }, 400)
      }
      const newDeck: DeckOut = {
        id: 'new', name: String(body.deck), topic: String(body.topic ?? ''),
        count: cards.length, due_count: cards.length, mastery_pct: 0, last_reviewed_at: null,
        created_at: '2026-06-23T00:00:00Z', updated_at: '2026-06-23T00:00:00Z',
      }
      decksRef.current = [...decksRef.current, newDeck]
      return fakeResponse({ ok: true, msg: `Đã nhập "${body.deck}" · ${cards.length} thẻ`, deck: newDeck })
    }
    if (url.includes('/decks') && method === 'GET') return fakeResponse(decksRef.current)
    return fakeResponse({ detail: 'not mocked' }, 404)
  }))
}

describe('LibraryScreen', () => {
  let decksRef: { current: DeckOut[] }
  beforeEach(() => {
    localStorage.clear(); useAppStore.setState({ ...initialState })
    decksRef = { current: [...decksFixture] }
    mockApi(decksRef)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('lists decks from the API', async () => {
    renderWithProviders(<LibraryScreen />)
    expect(await screen.findByText('Business English')).toBeInTheDocument()
    expect(screen.getByText('Bộ thẻ khởi động')).toBeInTheDocument()
  })

  it('import: invalid JSON shows error without calling the API', async () => {
    useAppStore.setState({ importOpen: true })
    renderWithProviders(<LibraryScreen />)
    await screen.findByText('Business English')
    await userEvent.click(screen.getByLabelText('json'))
    await userEvent.paste('{ bad')
    await userEvent.click(screen.getByRole('button', { name: 'Nhập' }))
    expect(screen.getByText(/JSON không hợp lệ/)).toBeInTheDocument()
  })

  it('import: valid JSON adds a deck and it appears', async () => {
    useAppStore.setState({ importOpen: true, importText: JSON.stringify({ deck: 'My Deck', cards: [{ word: 'x' }] }) })
    renderWithProviders(<LibraryScreen />)
    await screen.findByText('Business English')
    await userEvent.click(screen.getByRole('button', { name: 'Nhập' }))
    expect(await screen.findByText('My Deck')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npx vitest run src/features/library/library.test.tsx`
Expected: FAIL — LibraryScreen still imports `seedDecks`/store seams and isn't wrapped for async API data; `findByText('Business English')` resolves from the fixture only after wiring.

- [ ] **Step 3: Rewrite `frontend/src/features/library/DeckList.tsx`**

```tsx
import { DeckCard, type DeckCardProps } from './DeckCard'

function NewDeckTile({ onClick }: { onClick?: () => void }) {
  return (
    <div className="deck" onClick={onClick} style={{
      border: '1.5px dashed var(--line)', borderRadius: '16px', background: 'transparent',
      padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '8px',
      color: 'var(--muted)', minHeight: '138px',
    }}>
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M11 4.5v13M4.5 11h13" />
      </svg>
      <div style={{ fontSize: '14px' }}>Tạo bộ thẻ mới</div>
    </div>
  )
}

export function DeckList({ decks, onNewDeck }: { decks: DeckCardProps[]; onNewDeck?: () => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '18px' }}>
      {decks.map((d, i) => <DeckCard key={d.name + i} {...d} />)}
      <NewDeckTile onClick={onNewDeck} />
    </div>
  )
}
```

(The `ImportedDeckCard` component and the `useAppStore` import are removed — imported decks are now real API decks.)

- [ ] **Step 4: Rewrite `frontend/src/features/library/LibraryScreen.tsx`**

```tsx
import { useMemo, useState } from 'react'
import { useT } from '../../i18n/useT'
import { DeckList } from './DeckList'
import { GroupBySelector, type GroupBy } from './GroupBySelector'
import { ImportJsonModal } from './ImportJsonModal'
import { useDecks, useCreateDeck } from './queries'
import { toDeckCard } from './deck-view'
import { useAppStore } from '../../store/useAppStore'
import type { DeckCardProps } from './DeckCard'

export default function LibraryScreen() {
  const t = useT()
  const setPanel = useAppStore((s) => s.setPanel)
  const [group, setGroup] = useState<GroupBy>('topic')
  const [filterText, setFilterText] = useState('')
  const { data, isLoading, isError } = useDecks()
  const createDeck = useCreateDeck()

  const sorted = useMemo(() => {
    const list = [...(data ?? [])]
    if (group === 'mastery') list.sort((a, b) => b.mastery_pct - a.mastery_pct)
    else if (group === 'date') list.sort((a, b) => b.created_at.localeCompare(a.created_at))
    else list.sort((a, b) => a.topic.localeCompare(b.topic))
    return list
  }, [data, group])

  const decks: DeckCardProps[] = sorted
    .filter((d) => d.name.toLowerCase().includes(filterText.toLowerCase()))
    .map(toDeckCard)

  const totalCards = (data ?? []).reduce((n, d) => n + d.count, 0)
  const totalDecks = (data ?? []).length

  const onNewDeck = () => {
    const name = window.prompt('Tên bộ thẻ mới')?.trim()
    if (name) createDeck.mutate({ name })
  }

  return (
    <div style={{ animation: 'fadeUp .45s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '18px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px' }}>
            {totalCards} thẻ · {totalDecks} bộ
          </div>
          <h1 style={{ margin: 0, fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: '32px' }}>
            {t.libraryTitle}
          </h1>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            border: '1px solid var(--line)', borderRadius: '999px',
            padding: '8px 15px', background: 'var(--surface)',
            color: 'var(--muted)', fontSize: '14px', minWidth: '200px',
          }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" />
            </svg>
            <input
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="lọc bộ thẻ…"
              style={{ border: 'none', outline: 'none', background: 'transparent', color: 'var(--muted)', fontSize: '14px', width: '100%' }}
            />
          </div>
          <button
            onClick={() => setPanel('importOpen', true)}
            style={{
              border: '1px solid var(--line)', borderRadius: '11px', background: 'var(--surface)',
              color: 'var(--ink)', padding: '11px 16px', fontFamily: "'Hanken Grotesk',sans-serif",
              fontWeight: 600, fontSize: '14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 2.5v8M5.5 7L9 10.5 12.5 7M3.5 14h11" />
            </svg>
            {t.importJson}
          </button>
          <button
            onClick={onNewDeck}
            style={{
              border: 'none', borderRadius: '11px', background: 'var(--accent)',
              color: '#fff', padding: '11px 20px', fontFamily: "'Hanken Grotesk',sans-serif",
              fontWeight: 600, fontSize: '14px', cursor: 'pointer',
            }}
          >{t.newDeck}</button>
        </div>
      </div>

      <GroupBySelector value={group} onChange={setGroup} />
      {isLoading && <div style={{ color: 'var(--muted)', padding: '40px 0' }}>Đang tải bộ thẻ…</div>}
      {isError && <div style={{ color: 'var(--rust)', padding: '40px 0' }}>Không tải được bộ thẻ. Thử lại sau.</div>}
      {!isLoading && !isError && <DeckList decks={decks} onNewDeck={onNewDeck} />}
      <ImportJsonModal />
    </div>
  )
}
```

- [ ] **Step 5: Rewrite `frontend/src/features/library/ImportJsonModal.tsx`**

Replace the store `parseAndImport`/`importStatus` usage with `useImportDeck` + local status. The full file:

```tsx
import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useImportDeck } from './queries'
import { sampleJson } from '../../data/seed'
import type { ImportStatus } from '../../store/types'

const INVALID_MSG = 'JSON không hợp lệ hoặc thiếu trường bắt buộc (deck, cards[].word).'

export function ImportJsonModal() {
  const importOpen = useAppStore((s) => s.importOpen)
  const importText = useAppStore((s) => s.importText)
  const setPanel = useAppStore((s) => s.setPanel)
  const setImportText = useAppStore((s) => s.setImportText)
  const importDeck = useImportDeck()
  const [status, setStatus] = useState<ImportStatus | null>(null)

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader()
    r.onload = () => setImportText(String(r.result || ''))
    r.onerror = () => setStatus({ ok: false, msg: INVALID_MSG })
    r.readAsText(f)
  }

  const copySample = () => { try { navigator.clipboard.writeText(sampleJson) } catch (_) {} }

  const onImport = () => {
    let payload: unknown
    try { payload = JSON.parse(importText) } catch { setStatus({ ok: false, msg: INVALID_MSG }); return }
    importDeck.mutate(payload, {
      onSuccess: (r) => { setStatus({ ok: r.ok, msg: r.msg }); if (r.ok) setImportText('') },
      onError: () => setStatus({ ok: false, msg: INVALID_MSG }),
    })
  }

  if (!importOpen) return null

  const statusStyle: React.CSSProperties = {
    fontSize: '13px', fontWeight: 600,
    color: status && status.ok ? '#2f6b43' : 'var(--rust)',
  }

  return (
    <div
      onClick={() => setPanel('importOpen', false)}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(33,29,27,0.42)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', zIndex: 80,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '560px', maxWidth: '100%', maxHeight: '86vh', overflow: 'auto',
          background: 'var(--surface)', border: '1px solid var(--line)',
          borderRadius: '18px', boxShadow: '0 30px 60px -20px rgba(40,35,25,0.5)', padding: '26px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <h2 style={{ margin: 0, fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: '22px' }}>Nhập bộ thẻ từ JSON</h2>
          <button
            onClick={() => setPanel('importOpen', false)}
            style={{ border: 'none', background: 'transparent', fontSize: '20px', color: 'var(--muted)', cursor: 'pointer', lineHeight: 1 }}
          >✕</button>
        </div>
        <p style={{ margin: '0 0 14px', color: 'var(--muted)', fontSize: '14px', lineHeight: 1.5 }}>
          Chọn file <span style={{ fontFamily: 'monospace' }}>.json</span> theo cấu trúc mẫu bên dưới, hoặc dán trực tiếp rồi bấm Nhập.
        </p>
        <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '8px' }}>Cấu trúc mẫu</div>
        <pre style={{
          margin: '0 0 10px', background: 'var(--paper)', border: '1px solid var(--line)',
          borderRadius: '12px', padding: '14px', fontFamily: 'monospace', fontSize: '12.5px',
          lineHeight: 1.55, color: 'var(--ink)', overflow: 'auto', whiteSpace: 'pre',
        }}>{sampleJson}</pre>
        <button
          onClick={copySample}
          style={{
            border: '1px solid var(--line)', borderRadius: '9px', background: 'var(--surface)',
            color: 'var(--muted)', padding: '7px 13px', fontFamily: "'Hanken Grotesk',sans-serif",
            fontSize: '13px', cursor: 'pointer', marginBottom: '18px',
          }}
        >Sao chép mẫu</button>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
          <label style={{
            border: '1px solid var(--accent)', color: '#fff', background: 'var(--accent)',
            borderRadius: '10px', padding: '10px 18px', fontWeight: 600, fontSize: '14px', cursor: 'pointer',
          }}>
            Chọn file .json
            <input type="file" accept="application/json,.json" onChange={onFile} style={{ display: 'none' }} />
          </label>
          <span style={{ fontSize: '13px', color: 'var(--muted)' }}>hoặc dán bên dưới</span>
        </div>
        <textarea
          aria-label="json"
          rows={5}
          placeholder={'{ "deck": "...", "cards": [ ... ] }'}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          style={{
            width: '100%', border: '1px solid var(--line)', borderRadius: '10px',
            background: 'var(--paper)', padding: '10px 12px', fontFamily: 'monospace',
            fontSize: '12.5px', marginBottom: '12px', color: 'var(--ink)',
            resize: 'vertical', outline: 'none', boxSizing: 'border-box',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={onImport}
            disabled={importDeck.isPending}
            style={{
              border: 'none', borderRadius: '10px', background: 'var(--ink)',
              color: '#fff', padding: '10px 22px', fontFamily: "'Hanken Grotesk',sans-serif",
              fontWeight: 600, fontSize: '14px', cursor: 'pointer',
            }}
          >Nhập</button>
          {status && <span style={statusStyle}>{status.msg}</span>}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Run the library test to verify it passes**

Run: `cd frontend && npx vitest run src/features/library/library.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 7: Run the full suite + build** (the store still has `importedDecks`/`parseAndImport`; nothing references them now, but they remain until Task 4)

Run: `cd frontend && npm test && npm run build`
Expected: all tests pass; tsc build succeeds. (If `useAppStore.test.ts` still passes, it's because Task 4 hasn't trimmed the store yet — that's expected.)

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/library/LibraryScreen.tsx frontend/src/features/library/DeckList.tsx frontend/src/features/library/ImportJsonModal.tsx frontend/src/features/library/library.test.tsx
git commit -m "feat(frontend): wire Library + JSON import to the API"
```

---

## Task 4: Frontend — trim dead server-state from the store

Now that nothing reads `importedDecks`/`parseAndImport`/`importStatus`, remove them and trim `persist` to UI-prefs only.

**Files:**
- Modify: `frontend/src/store/types.ts`
- Modify: `frontend/src/store/useAppStore.ts`
- Modify: `frontend/src/store/useAppStore.test.ts`

**Interfaces:**
- Produces: `AppState` without `importedDecks`/`importStatus`; `AppActions` without `parseAndImport`; `persist` whitelist = `['dark','lang','collapsed']`. `ImportStatus` type stays exported (the import modal uses it).

- [ ] **Step 1: Update the store test `frontend/src/store/useAppStore.test.ts`** — replace the `resetProgress`, `parseAndImport` (3 tests) and persist tests with:

Replace the `resetProgress clears session and imported decks` test with:

```ts
  it('resetProgress clears session and closes panels', () => {
    useAppStore.setState({ sIndex: 3, sCorrect: 2, confirmReset: true, settingsOpen: true })
    useAppStore.getState().resetProgress()
    const s = useAppStore.getState()
    expect(s.sIndex).toBe(0); expect(s.sCorrect).toBe(0)
    expect(s.confirmReset).toBe(false); expect(s.settingsOpen).toBe(false)
  })
```

Delete the three `parseAndImport ...` tests entirely.

Replace the persist test with:

```ts
  it('persists only dark/lang/collapsed to snoopify_v1', () => {
    useAppStore.getState().setPanel('settingsOpen', true)
    useAppStore.setState({ sIndex: 4 })
    useAppStore.getState().toggleDark()
    const raw = JSON.parse(localStorage.getItem('snoopify_v1')!)
    const persisted = raw.state ?? raw
    expect(persisted.dark).toBe(true)
    expect('settingsOpen' in persisted).toBe(false)
    expect('sIndex' in persisted).toBe(false)
    expect('importedDecks' in persisted).toBe(false)
  })
```

(Keep the `advanceSession`, `resetSession`/`setGradeError`, and `setReviewMode` tests unchanged.)

- [ ] **Step 2: Run the store test to verify it fails**

Run: `cd frontend && npx vitest run src/store/useAppStore.test.ts`
Expected: FAIL — `parseAndImport` is still present (deleted tests pass vacuously is not the issue); the new persist test fails because `sIndex`/`importedDecks` ARE still persisted, and `resetProgress` still sets `importedDecks`.

- [ ] **Step 3: Trim `frontend/src/store/types.ts`**

- Remove the `Card` and `Deck` interfaces (lines 4–5).
- In `AppState`, remove `importStatus` and `importedDecks` fields.
- In `AppActions`, remove `parseAndImport(text: string): void`.
- Keep `ImportStatus` (used by the import modal).

Resulting file:

```ts
export type ReviewMode = 'flash' | 'quiz' | 'fill'
export type Lang = 'vn' | 'en'

export interface ImportStatus { ok: boolean; msg: string }

export interface AppState {
  reviewMode: ReviewMode
  flipped: boolean
  quizPick: string | null
  fillValue: string
  fillChecked: boolean
  sIndex: number
  sCorrect: number
  gradeError: boolean
  dark: boolean
  lang: Lang
  collapsed: boolean
  settingsOpen: boolean
  confirmReset: boolean
  importOpen: boolean
  notifOpen: boolean
  langMenuOpen: boolean
  importText: string
}

export interface AppActions {
  setReviewMode(mode: ReviewMode): void
  flip(): void
  pickQuiz(key: string): void
  setFill(value: string): void
  checkFill(): void
  advanceSession(correct: boolean): void
  resetSession(): void
  setGradeError(value: boolean): void
  toggleDark(): void
  setLang(lang: Lang): void
  toggleCollapsed(): void
  setPanel(panel: 'settingsOpen' | 'confirmReset' | 'importOpen' | 'notifOpen' | 'langMenuOpen', open: boolean): void
  setImportText(text: string): void
  resetProgress(): void
}

export type AppStore = AppState & AppActions
```

- [ ] **Step 4: Trim `frontend/src/store/useAppStore.ts`**

- Drop the `Deck` import (change `import type { AppStore, AppState, Deck } from './types'` to `import type { AppStore, AppState } from './types'`).
- `initialState`: remove `importStatus: null, importedDecks: []` (and the trailing `importText: ''` stays).
- `PERSIST_KEYS`: set to `['dark', 'lang', 'collapsed']`.
- Remove the entire `parseAndImport: (text) => {...}` action.
- `resetProgress`: remove `importedDecks: []` from the `set({...})`.

Resulting relevant pieces:

```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppStore, AppState } from './types'
import { applyTheme } from '../theme/tokens'

export const initialState: AppState = {
  reviewMode: 'flash', flipped: false, quizPick: null, fillValue: '', fillChecked: false,
  sIndex: 0, sCorrect: 0, gradeError: false, dark: false, lang: 'vn', collapsed: false,
  settingsOpen: false, confirmReset: false, importOpen: false, notifOpen: false, langMenuOpen: false,
  importText: '',
}

const PERSIST_KEYS: (keyof AppState)[] = ['dark', 'lang', 'collapsed']
```

And `resetProgress`:

```ts
      resetProgress: () => set({ sIndex: 0, sCorrect: 0, flipped: false, quizPick: null, fillValue: '', fillChecked: false, confirmReset: false, settingsOpen: false }),
```

(Delete the `parseAndImport` action block entirely. Everything else — `advanceSession`, `setGradeError`, `setImportText`, the `persist` config — is unchanged.)

- [ ] **Step 5: Run the store test to verify it passes**

Run: `cd frontend && npx vitest run src/store/useAppStore.test.ts`
Expected: PASS.

- [ ] **Step 6: Full suite + build (catch any stale reference)**

Run: `cd frontend && npm run build && npm test`
Expected: tsc build succeeds (no remaining references to `importedDecks`/`parseAndImport`/store `importStatus`); all tests pass. If tsc flags a stray reference, fix that file — search `cd frontend && grep -rn "importedDecks\|parseAndImport" src`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/store/types.ts frontend/src/store/useAppStore.ts frontend/src/store/useAppStore.test.ts
git commit -m "refactor(frontend): drop dead importedDecks/parseAndImport store state; trim persist to UI prefs"
```

---

## Self-Review

**Spec coverage (requirement → task):**
- 1c backend `mastery_pct`/`last_reviewed_at` → Task 1. ✓
- Library FE (`useDecks`, totals, `toDeckCard`, New-deck → `useCreateDeck`, loading/error/empty, grouping) → Tasks 2–3. ✓
- Import FE (`useImportDeck`, local status, invalidate `['decks']`) → Tasks 2–3; the non-standard `{ok,msg}` contract is handled by reading the body on any status (Task 2 `useImportDeck`). ✓
- Store/persist trim (remove `importedDecks`/`parseAndImport`; `resetProgress` stays UI-only minus `importedDecks`; persist = dark/lang/collapsed) → Task 4. ✓
- Tests migrated to providers + mocked fetch; `decksFixture` added → Tasks 2–4. ✓
- "Don't break Review/SettingsPanel": `resetProgress` kept (UI-only), `gradeError`/session actions untouched; ordering (Task 3 removes readers before Task 4 removes fields). ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code; commands have expected output. ✓

**Type consistency:** `DeckOut` fields match between backend `deck.py` (Task 1) and FE `api-types.ts` (Task 2). `toDeckCard` returns `DeckCardProps` (existing). `useDecks`/`useImportDeck`/`useCreateDeck` names match their call sites in Task 3. `API_BASE` (Task 2) used by `useImportDeck`. `ImportStatus` kept in `types.ts` (Task 4) and imported by the modal (Task 3). `decksFixture` (Task 2) used by `library.test.tsx` (Task 3). ✓

**Note (carry to final review / Plan 2-3):** imported decks lose the "đã nhập" badge (they are now ordinary API decks); the `New deck` flow uses `window.prompt` as a minimal entry — upgrade to a proper modal if desired.
