# Snoopify Add Card Screen — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Add screen persist cards to the real API, with a deck dropdown and inline deck creation.

**Architecture:** Follow-up Plan 2 of the FE↔BE integration, frontend-only, on branch `feat/frontend-integration`. Reuses group 1's `useDecks`/`useCreateDeck` (from `features/library/queries.ts`) and the harness (`lib/api.ts`, React Query, `renderWithProviders`/`fakeResponse`/`fixtures.ts`). Adds `useAddCard` and rewires `AddCardForm`'s save path + deck picker. The backend `POST /decks/{deck_id}/cards` already exists — no backend change.

**Tech Stack:** React 18, Vite, TypeScript, `@tanstack/react-query` v5, Vitest + @testing-library.

## Global Constraints

- **Branch:** `feat/frontend-integration`.
- FE always calls relative `/api/*`; server-state → React Query; TanStack Query v5 object syntax.
- `POST /decks/{deck_id}/cards` body is `CardCreate {word, phonetic?, pos?, meaning?, example?}` → `CardOut` (201). `word` is the only required field.
- The form's `tags` field and the `type` selector are **not** part of `CardCreate` — they are not sent (tags unsupported by the API). `pos` is sent from `data.pos` (currently always `''` — there is no pos input; leave it).
- Keep `npm run build` (tsc -b) green and the full Vitest suite passing. UI copy stays Vietnamese. DRY, YAGNI, TDD, commit per task.
- Out of scope: `QuickAdd` inline-add (it stays a navigation shortcut to `/add`); Dashboard/Progress/Settings-reset (Plan 3).

---

## File Structure

**Task 1 (foundation):**
- Modify `frontend/src/lib/api-types.ts` — add `CardCreate`, `CardOut`.
- Create `frontend/src/features/add/queries.ts` — `useAddCard`.
- Create `frontend/src/features/add/queries.test.tsx`.

**Task 2 (UI wiring):**
- Modify `frontend/src/features/add/AddCardForm.tsx`.
- Modify `frontend/src/features/add/add.test.tsx`.

---

## Task 1: `CardCreate`/`CardOut` types + `useAddCard` hook

**Files:**
- Modify: `frontend/src/lib/api-types.ts`
- Create: `frontend/src/features/add/queries.ts`
- Create: `frontend/src/features/add/queries.test.tsx`

**Interfaces:**
- Consumes: `apiPost` (lib/api), `fakeResponse` (test/fakeResponse).
- Produces:
  - Types `CardCreate`, `CardOut` from `lib/api-types.ts`.
  - `useAddCard()` → mutation accepting `{ deckId: string; card: CardCreate }`, POSTing to `/decks/{deckId}/cards`, returning `CardOut`; on success invalidates `['decks']` and `['decks', deckId]`.

- [ ] **Step 1: Add types to `frontend/src/lib/api-types.ts`** (append):

```ts
export interface CardCreate {
  word: string
  phonetic?: string
  pos?: string
  meaning?: string
  example?: string
}

export interface CardOut {
  id: string
  deck_id: string
  word: string
  phonetic: string
  pos: string
  meaning: string
  example: string
  ease_factor: number
  interval_days: number
  repetitions: number
  lapses: number
  due_at: string
  last_reviewed_at: string | null
  created_at: string
  updated_at: string
}
```

- [ ] **Step 2: Write the failing test `frontend/src/features/add/queries.test.tsx`**

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useAddCard } from './queries'
import { fakeResponse } from '../../test/fakeResponse'

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

afterEach(() => { vi.restoreAllMocks() })

describe('useAddCard', () => {
  it('POSTs the card to /decks/{deckId}/cards', async () => {
    const spy = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      fakeResponse({
        id: 'card1', deck_id: 'd1', word: 'x', phonetic: '', pos: '', meaning: '', example: '',
        ease_factor: 2.5, interval_days: 0, repetitions: 0, lapses: 0,
        due_at: '2026-06-23T00:00:00Z', last_reviewed_at: null,
        created_at: '2026-06-23T00:00:00Z', updated_at: '2026-06-23T00:00:00Z',
      }, 201))
    vi.stubGlobal('fetch', spy)
    const { result } = renderHook(() => useAddCard(), { wrapper: makeWrapper() })
    await result.current.mutateAsync({ deckId: 'd1', card: { word: 'x' } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(String(spy.mock.calls[0][0])).toContain('/decks/d1/cards')
    expect((spy.mock.calls[0][1] as RequestInit).method).toBe('POST')
  })
})
```

- [ ] **Step 3: Run it to verify it fails**

Run: `cd frontend && npx vitest run src/features/add/queries.test.tsx`
Expected: FAIL — `Failed to resolve import './queries'`.

- [ ] **Step 4: Implement `frontend/src/features/add/queries.ts`**

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiPost } from '../../lib/api'
import type { CardCreate, CardOut } from '../../lib/api-types'

export function useAddCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deckId, card }: { deckId: string; card: CardCreate }) =>
      apiPost<CardOut>(`/decks/${deckId}/cards`, card),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: ['decks'] })
      qc.invalidateQueries({ queryKey: ['decks', vars.deckId] })
    },
  })
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/features/add/queries.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/api-types.ts frontend/src/features/add/queries.ts frontend/src/features/add/queries.test.tsx
git commit -m "feat(frontend): card types + useAddCard hook"
```

---

## Task 2: Wire `AddCardForm` to save cards (deck dropdown + inline create)

**Files:**
- Modify: `frontend/src/features/add/AddCardForm.tsx`
- Modify: `frontend/src/features/add/add.test.tsx`

**Interfaces:**
- Consumes: `useDecks`, `useCreateDeck` (from `../library/queries`), `useAddCard` (Task 1), `CardCreate` (Task 1), `decksFixture`/`fakeResponse`/`renderWithProviders` (test).

- [ ] **Step 1: Rewrite the test `frontend/src/features/add/add.test.tsx` (failing)**

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddScreen from './AddScreen'
import { useAppStore, initialState } from '../../store/useAppStore'
import { renderWithProviders } from '../../test/renderWithProviders'
import { decksFixture } from '../../test/fixtures'
import { fakeResponse } from '../../test/fakeResponse'

function mockApi() {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = (init?.method ?? 'GET').toUpperCase()
    if (/\/decks\/[^/]+\/cards$/.test(url) && method === 'POST') {
      return fakeResponse({
        id: 'c1', deck_id: 'd1', word: 'x', phonetic: '', pos: '', meaning: '', example: '',
        ease_factor: 2.5, interval_days: 0, repetitions: 0, lapses: 0,
        due_at: '2026-06-23T00:00:00Z', last_reviewed_at: null,
        created_at: '2026-06-23T00:00:00Z', updated_at: '2026-06-23T00:00:00Z',
      }, 201)
    }
    if (url.includes('/decks') && method === 'GET') return fakeResponse(decksFixture)
    return fakeResponse({ detail: 'not mocked' }, 404)
  }))
}

describe('AddScreen', () => {
  beforeEach(() => { localStorage.clear(); useAppStore.setState({ ...initialState }); mockApi() })
  afterEach(() => { vi.restoreAllMocks() })

  it('typing updates the live preview', async () => {
    renderWithProviders(<AddScreen />)
    await userEvent.type(screen.getByLabelText('word'), 'ubiquitous')
    expect(screen.getByText('ubiquitous')).toBeInTheDocument()
  })

  it('saving posts a card to the selected deck', async () => {
    renderWithProviders(<AddScreen />)
    // deck dropdown defaults to the first loaded deck (d1)
    await screen.findByRole('option', { name: 'Bộ thẻ khởi động' })
    await userEvent.type(screen.getByLabelText('word'), 'ephemeral')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thẻ' }))
    await waitFor(() => {
      const calls = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls
      const posted = calls.some((c) =>
        /\/decks\/d1\/cards$/.test(String(c[0])) && ((c[1] as RequestInit | undefined)?.method ?? 'GET') === 'POST')
      expect(posted).toBe(true)
    })
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npx vitest run src/features/add/add.test.tsx`
Expected: FAIL — the form has no `option` role (deck is a text input), and clicking "Lưu thẻ" posts nothing.

- [ ] **Step 3: Rewrite `frontend/src/features/add/AddCardForm.tsx`** (full file)

```tsx
import { useEffect, useState } from 'react'
import { CardPreview, type PreviewData } from './CardPreview'
import { useDecks, useCreateDeck } from '../library/queries'
import { useAddCard } from './queries'
import type { CardCreate } from '../../lib/api-types'

const TYPES = ['Từ vựng', 'Cụm từ', 'Ngữ pháp', 'Câu mẫu', 'Ghi chú', 'Lỗi']

const empty: PreviewData = { word: '', phonetic: '', pos: '', meaning: '', example: '', deck: '', tags: '' }

const fieldStyle: React.CSSProperties = {
  width: '100%', border: '1px solid var(--line)', borderRadius: 10,
  padding: '11px 13px', fontFamily: "'Hanken Grotesk', sans-serif",
  fontSize: 15, color: 'var(--ink)', background: 'var(--paper)', outline: 'none',
}

export function AddCardForm() {
  const [type, setType] = useState(TYPES[0])
  const [data, setData] = useState<PreviewData>(empty)
  const [saved, setSaved] = useState<string[]>([])
  const [deckId, setDeckId] = useState<string>('')

  const { data: decks } = useDecks()
  const createDeck = useCreateDeck()
  const addCard = useAddCard()

  // default the picker to the first deck once decks load
  useEffect(() => {
    if (!deckId && decks && decks.length > 0) setDeckId(decks[0].id)
  }, [decks, deckId])

  const set = (k: keyof PreviewData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setData((d) => ({ ...d, [k]: e.target.value }))

  const handleSave = () => {
    const word = data.word.trim()
    if (!word || !deckId) return
    const card: CardCreate = {
      word, phonetic: data.phonetic, pos: data.pos, meaning: data.meaning, example: data.example,
    }
    addCard.mutate({ deckId, card }, {
      onSuccess: () => { setSaved((prev) => [word, ...prev].slice(0, 10)); setData(empty) },
    })
  }

  const onNewDeck = () => {
    const name = window.prompt('Tên bộ thẻ mới')?.trim()
    if (name) createDeck.mutate({ name }, { onSuccess: (deck) => setDeckId(deck.id) })
  }

  const canSave = !!deckId && data.word.trim().length > 0 && !addCard.isPending

  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
      {/* ── LEFT: form ── */}
      <section style={{
        flex: '1.4', minWidth: 400,
        border: '1px solid var(--line)', borderRadius: 18,
        background: 'var(--surface)', padding: 26,
        boxShadow: '0 1px 2px rgba(40,35,25,0.03)',
      }}>
        {/* Type selector */}
        <div style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10 }}>
          Loại
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
          {TYPES.map((tp) => (
            <button
              key={tp}
              onClick={() => setType(tp)}
              style={{
                fontSize: 13,
                border: tp === type ? '1px solid var(--accent)' : '1px solid var(--line)',
                color: tp === type ? 'var(--accent)' : 'var(--muted)',
                background: tp === type ? 'var(--accent-soft)' : 'transparent',
                borderRadius: 999, padding: '6px 14px', fontWeight: tp === type ? 600 : 400,
                fontFamily: "'Hanken Grotesk', sans-serif", cursor: 'pointer',
              }}
            >
              {tp}
            </button>
          ))}
        </div>

        {/* Word + Phonetic row */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Từ / cụm từ</div>
            <input aria-label="word" className="field" style={fieldStyle} placeholder="resilient" value={data.word} onChange={set('word')} />
          </div>
          <div style={{ width: 170 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Phiên âm</div>
            <input aria-label="phonetic" className="field" style={{ ...fieldStyle, fontFamily: 'monospace', fontSize: 13 }} placeholder="/rɪˈzɪl.i.ənt/" value={data.phonetic} onChange={set('phonetic')} />
          </div>
        </div>

        {/* Meaning */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Nghĩa</div>
          <input aria-label="meaning" className="field" style={fieldStyle} placeholder="có khả năng phục hồi nhanh; kiên cường" value={data.meaning} onChange={set('meaning')} />
        </div>

        {/* Example */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Ví dụ</div>
          <textarea aria-label="example" className="field" rows={2} style={{ ...fieldStyle, resize: 'vertical' }} placeholder="She is so resilient — she bounced back within a week." value={data.example} onChange={set('example')} />
        </div>

        {/* Deck picker + Tags row */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Bộ thẻ</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <select
                aria-label="deck"
                className="field"
                style={{ ...fieldStyle, flex: 1 }}
                value={deckId}
                onChange={(e) => setDeckId(e.target.value)}
              >
                {(!decks || decks.length === 0) && <option value="">(chưa có bộ thẻ)</option>}
                {decks?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <button
                onClick={onNewDeck}
                style={{
                  border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)',
                  padding: '0 14px', fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600,
                  fontSize: 14, color: 'var(--muted)', cursor: 'pointer', whiteSpace: 'nowrap',
                }}
              >+ Bộ mới</button>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>Tags</div>
            <input aria-label="tags" className="field" style={fieldStyle} placeholder="#adjective  #work" value={data.tags} onChange={set('tags')} />
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              border: 'none', borderRadius: 11, background: 'var(--accent)',
              color: '#fff', padding: '12px 26px',
              fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, fontSize: 15,
              cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.5,
              transition: 'transform .18s ease, box-shadow .18s ease',
            }}
            className="cta"
          >
            Lưu thẻ
          </button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              border: '1px solid var(--line)', borderRadius: 11, background: 'var(--surface)',
              padding: '12px 22px',
              fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, fontSize: 15,
              color: 'var(--muted)', cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.5,
              transition: 'background .15s ease',
            }}
            className="ghost"
          >
            Lưu &amp; thêm tiếp
          </button>
        </div>
      </section>

      {/* ── RIGHT: preview + recent ── */}
      <div style={{ width: 330, flex: 'none', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <CardPreview data={data} />
        {/* Recent strip */}
        <section style={{
          border: '1px solid var(--line)', borderRadius: 16,
          background: 'var(--paper)', padding: '18px 20px',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
            Đã lưu hôm nay · {saved.length}
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.7 }}>
            {saved.length > 0
              ? saved.join(' · ')
              : 'resilient · to beat around the bush · much vs many'}
          </div>
        </section>
      </div>
    </div>
  )
}
```

(Changes vs. the old file: imports the three hooks + `CardCreate`; adds `deckId` state + default-select effect; the "Bộ thẻ" field is now a `<select aria-label="deck">` + a "+ Bộ mới" button; `handleSave` POSTs via `useAddCard` then records the word locally; both action buttons call `handleSave` and are disabled via `canSave`. The `type`/`tags`/`pos` fields are unchanged and intentionally not sent.)

- [ ] **Step 4: Run the add test to verify it passes**

Run: `cd frontend && npx vitest run src/features/add/add.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Run the full suite + build**

Run: `cd frontend && npm test && npm run build`
Expected: all tests pass; tsc build succeeds.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/add/AddCardForm.tsx frontend/src/features/add/add.test.tsx
git commit -m "feat(frontend): Add screen saves cards via API with deck picker + inline create"
```

---

## Self-Review

**Spec coverage (requirement → task):**
- `CardCreate`/`CardOut` types + `useAddCard` (POST `/decks/{deckId}/cards`, invalidate `['decks']`/`['decks',deckId]`) → Task 1. ✓
- Deck dropdown from `useDecks`, default to first deck → Task 2 (`<select aria-label="deck">` + default effect). ✓
- Inline deck creation via `useCreateDeck` + auto-select → Task 2 (`onNewDeck`). ✓
- Save builds `CardCreate`, posts, records word, resets, keeps deck; disabled when no deck / empty word / pending → Task 2 (`handleSave`, `canSave`). ✓
- `add.test.tsx` migrated to `renderWithProviders` + mocked fetch; preview test kept + save-posts test added → Task 2. ✓
- QuickAdd left as a nav shortcut (out of scope) — documented in Global Constraints. ✓

**Placeholder scan:** No TBD/TODO; complete code in every code step; exact commands + expected output. ✓

**Type consistency:** `CardCreate`/`CardOut` (Task 1) match the backend `CardCreate`/`CardOut`. `useAddCard({deckId, card})` signature (Task 1) matches the call site in `AddCardForm.handleSave` (Task 2). `useDecks`/`useCreateDeck` imported from `../library/queries` exist (group 1). `decksFixture` (group 1) used by the test. ✓

**Notes (carry to Plan 3 / review):** `tags` and `pos` are collected in the form but not persisted (the API has no fields for them) — surface to the user if tag support is wanted. Both action buttons currently behave identically ("save + reset"); kept as-is to preserve existing UX.
