# Finish Next.js Replatform (SP-A) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the four remaining screens (Library, Review, Add, Progress) to the Next.js App Router server-first pattern, wire the guided tour, wire the existing fake-auth into Next routing, and remove the Vite / react-router / TanStack Query stack — so every route resolves on Next with no 404s.

**Architecture:** Each screen becomes a server `page.tsx` that reads via `apiFetch` (`Promise.all`) and passes data as props into `'use client'` islands. Islands keep UI-only state and perform writes with `apiPost`/`fetch('/api/...')` + `router.refresh()`. No `useQuery`/`useMutation`/`queryClient` survives. Mirrors the already-shipped Dashboard exactly.

**Tech Stack:** Next 15 (App Router, React 18, `output: 'standalone'`), TypeScript, Tailwind v3, Zustand (UI-state only), Vitest + @testing-library.

## Global Constraints

- **Server reads:** server `page.tsx` calls `apiFetch<T>(path)` (hits `BACKEND_URL` directly, NO `/api` prefix), combined with `Promise.all`. Tolerate a failed read with `.catch(() => fallback)`.
- **Client writes:** `'use client'` islands use `apiPost`/`apiGet` from `lib/api.ts` (these hit `/api/*`, which `next.config.ts` rewrites to the backend, stripping `/api`) or a raw `fetch('/api/...')`. Follow every successful write with `router.refresh()` from `next/navigation`.
- **No new react-query:** do NOT add `useQuery`/`useMutation`/`QueryClientProvider`/`queryClient` to any ported code.
- **Keep** in `lib/api.ts`: `apiFetch`, `apiGet`, `apiPost`, `apiPatch`, `apiDelete`, `ApiError`, `API_BASE`. Only the react-query wrapper files are removed.
- **UI copy stays Vietnamese.** Keep all existing inline styles verbatim — only the data-flow (hooks→props, mutation calls) changes.
- **Frontend port 3000.** Suite green per task. Commit per task.
- **Test pattern** (from `dashboard.test.tsx`): `vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))`; render client components with fixture props; assert rendered output and (for writes) that `apiPost` was called with the expected path/body.
- **Fixtures available** in `src/test/fixtures.ts`: `decksFixture: DeckOut[]`, `reviewSessionFixture: ReviewItemOut[]`, `progressSummaryFixture: ProgressSummary`, `heatmapFixture: HeatmapOut`, `needsReviewFixture: NeedsReviewItem[]`, `wordOfDayFixture`, `recentCardsFixture: CardOut[]`.
- **Auth is fake this plan** (client guard + store `login()` flag). Real BFF-cookie auth + per-user data is SP-B (separate plan).

---

## Task 1: Library screen → Next

**Files:**
- Create: `frontend/src/app/library/page.tsx`
- Modify: `frontend/src/features/library/LibraryScreen.tsx` (remove `useDecks`/`useCreateDeck`; take `decks` prop; create-deck via `apiPost` + `router.refresh()`)
- Modify: `frontend/src/features/library/ImportJsonModal.tsx` (remove `useImportDeck`; POST to `/api/decks/import` directly + `router.refresh()` on ok)
- Modify: `frontend/src/features/library/library.test.tsx` (drop QueryClient/MemoryRouter; props-driven)

**Interfaces:**
- Consumes: `apiFetch<DeckOut[]>('/decks')` (server), `apiPost<DeckOut>('/decks', {name})` (client).
- Produces: `LibraryScreen({ decks }: { decks: DeckOut[] })` (default export, `'use client'`).

- [ ] **Step 1: Write the failing test** — `frontend/src/features/library/library.test.tsx` (replace file contents)

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import LibraryScreen from './LibraryScreen'
import { decksFixture } from '../../test/fixtures'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
afterEach(() => vi.restoreAllMocks())

describe('LibraryScreen (props-driven)', () => {
  it('renders deck names and the total counts from props', () => {
    render(<LibraryScreen decks={decksFixture} />)
    expect(screen.getByText(decksFixture[0].name)).toBeInTheDocument()
    const totalCards = decksFixture.reduce((s, d) => s + d.count, 0)
    expect(screen.getByText(new RegExp(`${totalCards} thẻ`))).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/library/library.test.tsx`
Expected: FAIL — `LibraryScreen` still expects no props / imports `./queries`.

- [ ] **Step 3: Convert `LibraryScreen.tsx`** — make it props-driven, drop react-query

Replace the top of the file (imports + signature + the data lines) with:

```tsx
'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import { apiPost } from '../../lib/api'
import { DeckList } from './DeckList'
import { GroupBySelector, type GroupBy } from './GroupBySelector'
import { ImportJsonModal } from './ImportJsonModal'
import { toDeckCard } from './deck-view'
import type { DeckCardProps } from './DeckCard'
import type { DeckOut } from '../../lib/api-types'

export default function LibraryScreen({ decks: apiDecks }: { decks: DeckOut[] }) {
  const t = useT()
  const router = useRouter()
  const setPanel = useAppStore((s) => s.setPanel)
  const [group, setGroup] = useState<GroupBy>('topic')
  const [filterText, setFilterText] = useState('')
```

Then update the derived values (the list was `apiDecks ?? []`; now `apiDecks` is always an array prop):

```tsx
  const decks: DeckCardProps[] = useMemo(() => {
    const needle = filterText.trim().toLowerCase()
    const sorted = [...apiDecks].sort((a: DeckOut, b: DeckOut) => {
      if (group === 'mastery') return b.mastery_pct - a.mastery_pct
      if (group === 'date') return b.created_at.localeCompare(a.created_at)
      return a.topic.localeCompare(b.topic)
    })
    return sorted.filter((d) => d.name.toLowerCase().includes(needle)).map(toDeckCard)
  }, [apiDecks, filterText, group])

  const totalCards = apiDecks.reduce((sum, deck) => sum + deck.count, 0)
  const totalDecks = apiDecks.length

  const onNewDeck = async () => {
    const name = window.prompt('Tên bộ thẻ mới')?.trim()
    if (!name) return
    await apiPost<DeckOut>('/decks', { name })
    router.refresh()
  }
```

At the bottom, remove the `decksQuery.isLoading`/`isError` branches (server already resolved); render `<DeckList decks={decks} onNewDeck={onNewDeck} />` and `<ImportJsonModal />` directly.

- [ ] **Step 4: Convert `ImportJsonModal.tsx`** — drop `useImportDeck`

Remove `import { useImportDeck } from './queries'` and `const importDeck = useImportDeck()`. Add `import { useRouter } from 'next/navigation'` and `import type { ImportResult } from '../../lib/api-types'`. Inside the component add `const router = useRouter()`. Replace the import-submit handler body (whatever calls `importDeck.mutate`) with:

```tsx
  const submitImport = async () => {
    let payload: unknown
    try { payload = JSON.parse(importText) } catch { setStatus({ ok: false, msg: INVALID_MSG }); return }
    // /decks/import returns {ok,msg,deck?} for BOTH 200 and 400 — read body on any status.
    const res = await fetch('/api/decks/import', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    })
    const result = (await res.json()) as ImportResult
    setStatus({ ok: result.ok, msg: result.msg })
    if (result.ok) { setPanel('importOpen', false); router.refresh() }
  }
```

Wire `submitImport` to the existing import button's `onClick`.

- [ ] **Step 5: Create the server page** — `frontend/src/app/library/page.tsx`

```tsx
import { apiFetch } from '../../lib/api'
import type { DeckOut } from '../../lib/api-types'
import LibraryScreen from '../../features/library/LibraryScreen'

export default async function LibraryPage() {
  const decks = await apiFetch<DeckOut[]>('/decks').catch(() => [] as DeckOut[])
  return <LibraryScreen decks={decks} />
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/library/library.test.tsx`
Expected: PASS.

- [ ] **Step 7: Verify the route renders** (dev server on :3000 already runs)

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/library`
Expected: `200` (was `404`).

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/library frontend/src/features/library
git commit -m "feat(frontend): port Library screen to Next server page + props"
```

---

## Task 2: Add screen → Next

**Files:**
- Create: `frontend/src/app/add/page.tsx`
- Modify: `frontend/src/features/add/AddCardForm.tsx` (drop `useDecks`/`useCreateDeck`/`useAddCard`; take `decks` prop; writes via `apiPost` + `router.refresh()`)
- Modify: `frontend/src/features/add/add.test.tsx` (props-driven)

**Interfaces:**
- Consumes: `apiFetch<DeckOut[]>('/decks')` (server); `apiPost<CardOut>('/decks/{deckId}/cards', card)`, `apiPost<DeckOut>('/decks', {name})` (client).
- Produces: `AddCardForm({ decks }: { decks: DeckOut[] })` (named export, `'use client'`).

- [ ] **Step 1: Write the failing test** — `frontend/src/features/add/add.test.tsx` (replace file contents)

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AddCardForm } from './AddCardForm'
import { decksFixture } from '../../test/fixtures'
import * as api from '../../lib/api'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
afterEach(() => vi.restoreAllMocks())

describe('AddCardForm (props-driven)', () => {
  it('saves a card via apiPost to the selected deck', async () => {
    const spy = vi.spyOn(api, 'apiPost').mockResolvedValue({} as never)
    render(<AddCardForm decks={decksFixture} />)
    // The word field uses aria-label="word"; the save button text is "Lưu thẻ".
    fireEvent.change(screen.getByLabelText('word'), { target: { value: 'serendipity' } })
    fireEvent.click(screen.getByText('Lưu thẻ'))
    expect(spy).toHaveBeenCalledWith(
      `/decks/${decksFixture[0].id}/cards`,
      expect.objectContaining({ word: 'serendipity' }),
    )
  })
})
```

(`decksFixture[0].id` is `'d1'`, so the expected path is `/decks/d1/cards`. The save handler is async; if the assertion races, wrap it in `await vi.waitFor(() => expect(spy)...)`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/add/add.test.tsx`
Expected: FAIL — `AddCardForm` imports `./queries` / `../library/queries`, no `decks` prop.

- [ ] **Step 3: Convert `AddCardForm.tsx`**

Replace the imports + signature + the three hook lines:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CardPreview, type PreviewData } from './CardPreview'
import { apiPost } from '../../lib/api'
import type { CardCreate, CardOut, DeckOut } from '../../lib/api-types'
// ...TYPES, empty, fieldStyle unchanged...

export function AddCardForm({ decks }: { decks: DeckOut[] }) {
  const router = useRouter()
  const [type, setType] = useState(TYPES[0])
  const [data, setData] = useState<PreviewData>(empty)
  const [saved, setSaved] = useState<string[]>([])
  const [deckId, setDeckId] = useState<string>('')
  const [saveError, setSaveError] = useState(false)
  const selectedDeckId = deckId || decks[0]?.id || ''
```

Replace `handleSave` and `onNewDeck` to use `apiPost`:

```tsx
  const handleSave = async () => {
    const word = data.word.trim()
    if (!word || !selectedDeckId) return
    const card: CardCreate = { word, phonetic: data.phonetic, pos: data.pos, meaning: data.meaning, example: data.example }
    setSaveError(false)
    try {
      await apiPost<CardOut>(`/decks/${selectedDeckId}/cards`, card)
      setSaved((prev) => [word, ...prev].slice(0, 10))
      setData(empty)
      router.refresh()
    } catch { setSaveError(true) }
  }

  const onNewDeck = async () => {
    const name = window.prompt('Tên bộ thẻ mới')?.trim()
    if (!name) return
    const deck = await apiPost<DeckOut>('/decks', { name })
    setDeckId(deck.id)
    router.refresh()
  }
```

Replace any `decks?.` reads in the JSX deck picker with `decks.` (it is a guaranteed array now).

- [ ] **Step 4: Create the server page** — `frontend/src/app/add/page.tsx`

```tsx
import { apiFetch } from '../../lib/api'
import type { DeckOut } from '../../lib/api-types'
import { AddCardForm } from '../../features/add/AddCardForm'
import AddScreen from '../../features/add/AddScreen'

export default async function AddPage() {
  const decks = await apiFetch<DeckOut[]>('/decks').catch(() => [] as DeckOut[])
  return <AddScreen decks={decks} />
}
```

Modify `AddScreen.tsx` to accept and forward the prop: change its signature to `export default function AddScreen({ decks }: { decks: DeckOut[] })` (import `DeckOut`), add `'use client'` at the top (it uses `useT`), and render `<AddCardForm decks={decks} />`.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/add/add.test.tsx`
Expected: PASS.

- [ ] **Step 6: Verify the route**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/add`
Expected: `200`.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/app/add frontend/src/features/add
git commit -m "feat(frontend): port Add screen to Next server page + props"
```

---

## Task 3: Progress screen → Next

**Files:**
- Create: `frontend/src/app/progress/page.tsx`
- Modify: `frontend/src/features/progress/ProgressScreen.tsx` (take 3 props; distribute to children)
- Modify: `frontend/src/features/progress/{Calendar,ReviewBars,MasteryLevels,NeedsReview}.tsx` (take props; drop `useHeatmap`/`useProgressSummary`/`useNeedsReview`)
- Modify: `frontend/src/features/progress/progress.test.tsx` (props-driven)

**Interfaces:**
- Consumes: `apiFetch` of `/progress/summary`, `/progress/heatmap`, `/progress/needs-review` (server).
- Produces:
  - `ProgressScreen({ summary, heatmap, needsReview })` (default, `'use client'`)
  - `Calendar({ heatmap }: { heatmap: HeatmapOut | null })`
  - `ReviewBars({ summary }: { summary: ProgressSummary | null })`
  - `MasteryLevels({ summary }: { summary: ProgressSummary | null })`
  - `NeedsReview({ items }: { items: NeedsReviewItem[] })`

- [ ] **Step 1: Write the failing test** — `frontend/src/features/progress/progress.test.tsx` (replace file contents)

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProgressScreen from './ProgressScreen'
import { progressSummaryFixture, heatmapFixture, needsReviewFixture } from '../../test/fixtures'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
afterEach(() => vi.restoreAllMocks())

describe('ProgressScreen (props-driven)', () => {
  it('renders the streak stat tile from the summary prop', () => {
    render(<ProgressScreen summary={progressSummaryFixture} heatmap={heatmapFixture} needsReview={needsReviewFixture} />)
    expect(screen.getByText(String(progressSummaryFixture.streak))).toBeInTheDocument()
    expect(screen.getByText('ngày liên tục')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/progress/progress.test.tsx`
Expected: FAIL — `ProgressScreen` expects no props and children import `./queries`.

- [ ] **Step 3: Convert the four children to props**

`Calendar.tsx`:
```tsx
import type { HeatmapOut } from '../../lib/api-types'
export function Calendar({ heatmap }: { heatmap: HeatmapOut | null }) {
  const levels = heatmap?.cells ?? Array.from({ length: 126 }, () => 0)
  // ...rest of the JSX unchanged...
}
```

`ReviewBars.tsx` and `MasteryLevels.tsx`: replace `const { data, isError } = useProgressSummary()` with the prop `({ summary }: { summary: ProgressSummary | null })` and use `summary` where `data` was used (drop `isError` — the server page handles fetch failure). Remove the `./queries` import; import `ProgressSummary` from `../../lib/api-types`.

`NeedsReview.tsx`: replace `const { data, isError } = useNeedsReview()` with `({ items }: { items: NeedsReviewItem[] })`; use `items` where `data` was used; import `NeedsReviewItem` from `../../lib/api-types`.

- [ ] **Step 4: Convert `ProgressScreen.tsx`** — take props, distribute

```tsx
'use client'
import { useT } from '../../i18n/useT'
import { Calendar } from './Calendar'
import { ReviewBars } from './ReviewBars'
import { MasteryLevels } from './MasteryLevels'
import { NeedsReview } from './NeedsReview'
import type { ProgressSummary, HeatmapOut, NeedsReviewItem } from '../../lib/api-types'

export default function ProgressScreen({ summary, heatmap, needsReview }: {
  summary: ProgressSummary | null
  heatmap: HeatmapOut | null
  needsReview: NeedsReviewItem[]
}) {
  const t = useT()
  const s = summary
  // ...header + stat tiles unchanged (already read from `s`)...
  // In the body, pass props down:
  //   <Calendar heatmap={heatmap} /> <ReviewBars summary={summary} />
  //   <MasteryLevels summary={summary} /> <NeedsReview items={needsReview} />
}
```

Keep the `isError` alert block only if you keep an `isError` prop; simplest is to drop it (server page already falls back to nulls). Remove the `useProgressSummary` import.

- [ ] **Step 5: Create the server page** — `frontend/src/app/progress/page.tsx`

```tsx
import { apiFetch } from '../../lib/api'
import type { ProgressSummary, HeatmapOut, NeedsReviewItem } from '../../lib/api-types'
import ProgressScreen from '../../features/progress/ProgressScreen'

export default async function ProgressPage() {
  const [summary, heatmap, needsReview] = await Promise.all([
    apiFetch<ProgressSummary>('/progress/summary').catch(() => null),
    apiFetch<HeatmapOut>('/progress/heatmap').catch(() => null),
    apiFetch<NeedsReviewItem[]>('/progress/needs-review').catch(() => [] as NeedsReviewItem[]),
  ])
  return <ProgressScreen summary={summary} heatmap={heatmap} needsReview={needsReview} />
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/progress/progress.test.tsx`
Expected: PASS.

- [ ] **Step 7: Verify the route**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/progress`
Expected: `200`.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/progress frontend/src/features/progress
git commit -m "feat(frontend): port Progress screen to Next server page + props"
```

---

## Task 4: Review screen → Next

**Files:**
- Create: `frontend/src/app/review/page.tsx`
- Create: `frontend/src/features/review/grade.ts` (replaces `useGradeMutation`)
- Modify: `frontend/src/features/review/ReviewScreen.tsx` (take `session` prop; `next/navigation`)
- Modify: `frontend/src/features/review/{FlashcardMode,QuizMode,FillMode}.tsx` (call `submitGrade` instead of `useGradeMutation`)
- Modify: `frontend/src/features/review/SessionComplete.tsx` (`router.refresh()` instead of query invalidation; `next/navigation`)
- Modify: `frontend/src/features/review/review.test.tsx` (props-driven)

**Interfaces:**
- Consumes: `apiFetch<ReviewItemOut[]>('/review/session?limit=20')` → `toSessionItem` (server).
- Produces:
  - `submitGrade(req: GradeRequest): Promise<void>` in `grade.ts` — `apiPost('/review/grade', req)`, on error sets `useAppStore.getState().setGradeError(true)`, on success `setGradeError(false)`.
  - `ReviewScreen({ session }: { session: SessionCard[] })` (default, `'use client'`).

- [ ] **Step 1: Write the failing test** — `frontend/src/features/review/review.test.tsx` (replace file contents)

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ReviewScreen from './ReviewScreen'
import { reviewSessionFixture } from '../../test/fixtures'
import { toSessionItem } from '../../lib/adapters'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
afterEach(() => vi.restoreAllMocks())

describe('ReviewScreen (props-driven)', () => {
  it('shows the empty-state message when the session has no cards', () => {
    render(<ReviewScreen session={[]} />)
    expect(screen.getByText(/Không có thẻ nào đến hạn/)).toBeInTheDocument()
  })
  it('renders the card count for a non-empty session', () => {
    const session = reviewSessionFixture.map(toSessionItem)
    render(<ReviewScreen session={session} />)
    expect(screen.getByText(new RegExp(`/ ${session.length}`))).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/review/review.test.tsx`
Expected: FAIL — `ReviewScreen` calls `useSession()` / imports `./queries`.

- [ ] **Step 3: Create `grade.ts`**

```tsx
import { apiPost } from '../../lib/api'
import { useAppStore } from '../../store/useAppStore'
import type { GradeRequest, GradeResult } from '../../lib/api-types'

// The session advances optimistically; persist the grade and surface a
// non-blocking warning on failure (mirrors the old useGradeMutation behavior).
export async function submitGrade(req: GradeRequest): Promise<void> {
  try {
    await apiPost<GradeResult>('/review/grade', req)
    useAppStore.getState().setGradeError(false)
  } catch {
    useAppStore.getState().setGradeError(true)
  }
}
```

- [ ] **Step 4: Update the three modes** — replace the grade hook

In `FlashcardMode.tsx`, `QuizMode.tsx`, `FillMode.tsx`: remove `import { useGradeMutation } from './queries'` and `const grade = useGradeMutation()`; add `import { submitGrade } from './grade'`. Replace each `grade.mutate({...})` call with `submitGrade({...})` (same argument object). Example in `FlashcardMode`:

```tsx
import { submitGrade } from './grade'
// ...
  const handleRate = (rating: Rating) => {
    submitGrade({ card_id: cur.cardId, rating, mode: 'flash', is_correct: null })
    advance(rating !== 'forgot')
  }
```

- [ ] **Step 5: Convert `ReviewScreen.tsx`** — props + `next/navigation`

Replace `import { useNavigate } from 'react-router-dom'` with `import { useRouter } from 'next/navigation'`; remove `import { useSession } from './queries'`. Add `'use client'` at the very top. Change signature to `export default function ReviewScreen({ session }: { session: SessionCard[] })` (import `SessionCard` from `../../lib/adapters`). Replace `const nav = useNavigate()` with `const router = useRouter()` and every `nav('/')` with `router.push('/')`. Delete the `useSession()` call and the `isLoading`/`isError` branches. Replace the session-derivation:

```tsx
  const sessionKey = session.length ? session.map((c) => c.cardId).join('|') : null
  useEffect(() => { if (sessionKey !== null) resetSession() }, [sessionKey, resetSession])

  const total = session.length
  if (total === 0) return <ReviewMessage text="Không có thẻ nào đến hạn ôn tập. Quay lại sau nhé!" onHome={() => router.push('/')} />
  if (sIndex >= total) return <SessionComplete correct={sCorrect} total={total} />
  const cur = session[sIndex]
```

- [ ] **Step 6: Convert `SessionComplete.tsx`**

Replace `import { useNavigate } from 'react-router-dom'` + `import { useQueryClient } from '@tanstack/react-query'` with `import { useRouter } from 'next/navigation'`. Remove `const qc = useQueryClient()` and `const nav = useNavigate()`; add `const router = useRouter()`. Replace `reviewAgain` and the home button:

```tsx
  // Starting a fresh session must refetch the due cards — router.refresh() re-runs
  // the server page fetch of /review/session (the just-graded cards are now rescheduled).
  const reviewAgain = () => { resetSession(); router.refresh() }
  // home button onClick:
  onClick={() => { resetSession(); router.push('/') }}
```

- [ ] **Step 7: Create the server page** — `frontend/src/app/review/page.tsx`

```tsx
import { apiFetch } from '../../lib/api'
import type { ReviewItemOut } from '../../lib/api-types'
import { toSessionItem } from '../../lib/adapters'
import ReviewScreen from '../../features/review/ReviewScreen'

export default async function ReviewPage() {
  const items = await apiFetch<ReviewItemOut[]>('/review/session?limit=20').catch(() => [] as ReviewItemOut[])
  return <ReviewScreen session={items.map(toSessionItem)} />
}
```

- [ ] **Step 8: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/review/review.test.tsx`
Expected: PASS.

- [ ] **Step 9: Verify the route**

Run: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/review`
Expected: `200`.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/app/review frontend/src/features/review
git commit -m "feat(frontend): port Review screen to Next server page + grade helper"
```

---

## Task 5: Wire the guided tour into AppShell

**Files:**
- Modify: `frontend/src/components/AppShell.tsx` (mount `GuidedTourOverlay`; auto-start effect)
- Modify: `frontend/src/components/AppShell.test.tsx` (assert overlay mounts / tour effect guarded)

**Interfaces:**
- Consumes: `GuidedTourOverlay` (existing client component), `useTourStore().startTour`.
- Produces: AppShell renders the overlay after `<main>` and triggers `startTour` for first-time users.

- [ ] **Step 1: Write the failing test** — append to `frontend/src/components/AppShell.test.tsx`

```tsx
it('mounts the guided tour overlay', () => {
  render(<AppShell><div>child</div></AppShell>)
  // GuidedTourOverlay renders nothing until active, but the auto-start effect must run
  // without throwing when localStorage has no tour flag.
  expect(screen.getByText('child')).toBeInTheDocument()
})
```

(If `AppShell.test.tsx` mocks `next/navigation`, keep that mock; the Sidebar inside AppShell needs `useRouter`/`usePathname`.)

- [ ] **Step 2: Run test to verify it fails or errors**

Run: `cd frontend && npx vitest run src/components/AppShell.test.tsx`
Expected: FAIL/ERROR if `GuidedTourOverlay` import is missing or the effect throws; PASS only after Step 3 wiring is clean.

- [ ] **Step 3: Wire the overlay + auto-start in `AppShell.tsx`**

Add imports and an effect; render the overlay after `</main>`:

```tsx
'use client'
import { useEffect } from 'react'
import { Sidebar } from './layout/Sidebar'
import { Topbar } from './layout/Topbar'
import { GuidedTourOverlay } from './layout/GuidedTourOverlay'
import { useTourStore } from '../store/useTourStore'

export function AppShell({ children }: { children: React.ReactNode }) {
  const startTour = useTourStore((s) => s.startTour)
  useEffect(() => {
    let tourDone: string | null
    try { tourDone = localStorage.getItem('myenglish_tour_done') } catch { tourDone = '1' }
    if (tourDone === '1') return
    const id = setTimeout(startTour, 450)
    return () => clearTimeout(id)
  }, [startTour])

  return (
    <div style={{ /* ...existing shell styles unchanged... */ }}>
      <Sidebar />
      <main style={{ /* ...unchanged... */ }}>
        <Topbar />
        {children}
      </main>
      <GuidedTourOverlay />
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/AppShell.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/AppShell.tsx frontend/src/components/AppShell.test.tsx
git commit -m "feat(frontend): mount guided tour overlay + auto-start in AppShell"
```

---

## Task 6: Auth route + client guard (off react-router)

**Files:**
- Create: `frontend/src/app/login/page.tsx`
- Modify: `frontend/src/features/auth/AuthScreen.tsx` (`next/navigation` instead of react-router)
- Modify: `frontend/src/components/AppShell.tsx` (client guard; bare render on `/login`)
- Modify: `frontend/src/components/AppShell.test.tsx` (the guard makes the shell render nothing unless authenticated — existing tests assume the shell renders; authenticate them and add `replace` to the `next/navigation` mock)
- Create: `frontend/src/features/auth/auth.test.tsx`

**Interfaces:**
- Consumes: `useAppStore().isAuthenticated`, `useAppStore().login` (existing fake auth).
- Produces: `/login` route rendering `AuthScreen`; AppShell redirects unauthenticated users to `/login` and renders login bare (no sidebar chrome).

- [ ] **Step 1: Write the failing test** — `frontend/src/features/auth/auth.test.tsx`

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AuthScreen from './AuthScreen'
import { useAppStore } from '../../store/useAppStore'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }))
afterEach(() => { vi.restoreAllMocks(); push.mockClear() })

describe('AuthScreen (Next routing)', () => {
  it('logs in and navigates home', () => {
    render(<AuthScreen />)
    fireEvent.click(screen.getAllByText(/Đăng nhập|Tiếp tục/i)[0])
    expect(useAppStore.getState().isAuthenticated).toBe(true)
    expect(push).toHaveBeenCalledWith('/')
  })
})
```

(Adjust the clicked control to whatever submits the form; keep the two assertions.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/features/auth/auth.test.tsx`
Expected: FAIL — `AuthScreen` imports `react-router-dom`'s `useNavigate` (mock targets `next/navigation`).

- [ ] **Step 3: Convert `AuthScreen.tsx`**

Add `'use client'` at the top. Replace `import { useNavigate } from 'react-router-dom'` with `import { useRouter } from 'next/navigation'`; replace `const navigate = useNavigate()` with `const router = useRouter()`; replace every `navigate('/')` with `router.push('/')`.

- [ ] **Step 4: Create `app/login/page.tsx`**

```tsx
import AuthScreen from '../../features/auth/AuthScreen'
export default function LoginPage() { return <AuthScreen /> }
```

- [ ] **Step 5: Add the client guard to `AppShell.tsx`**

```tsx
import { usePathname, useRouter } from 'next/navigation'
import { useAppStore } from '../store/useAppStore'
// inside AppShell:
  const pathname = usePathname()
  const router = useRouter()
  const isAuthenticated = useAppStore((s) => s.isAuthenticated)

  // Login renders bare (no sidebar/topbar, no guard).
  if (pathname === '/login') return <>{children}</>

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login')
  }, [isAuthenticated, router])
  if (!isAuthenticated) return null
```

Place the `pathname === '/login'` early-return BEFORE the tour effect so hooks order stays stable — i.e. keep ALL `useEffect`/`useStore` hook calls above any conditional return. Concretely: call all hooks first, then `if (pathname === '/login') return <>{children}</>`, then the guard's `if (!isAuthenticated) return null`, then the shell JSX. (React requires hooks run unconditionally; do not put the tour `useEffect` after an early return.)

- [ ] **Step 5b: Fix `AppShell.test.tsx` for the guard** — the existing mock is `useRouter: () => ({ push: pushMock })` and `usePathname: () => currentPathname`; the guard calls `router.replace`, and with the default store (`isAuthenticated: false`) the shell now renders `null`. Update the test so the shell renders:
  - Add `replace: vi.fn()` to the mocked `useRouter` return.
  - In `beforeEach`, after resetting the store, authenticate: `useAppStore.setState({ isAuthenticated: true })`. This also covers the Task 5 tour-overlay test (same file).
  - Keep `currentPathname = '/'` (not `/login`) so the shell chrome renders.

- [ ] **Step 6: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/features/auth/auth.test.tsx src/components/AppShell.test.tsx`
Expected: PASS.

- [ ] **Step 7: Verify routes**

Run:
```bash
curl -s -o /dev/null -w "login %{http_code}\n" http://localhost:3000/login
```
Expected: `login 200`.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/login frontend/src/features/auth frontend/src/components/AppShell.tsx frontend/src/components/AppShell.test.tsx
git commit -m "feat(frontend): /login route + client auth guard (fake-auth seam for SP-B)"
```

---

## Task 7: Remove the Vite / react-router / TanStack Query stack

**Files:**
- Delete: `frontend/src/features/{library,review,add,progress,dashboard}/queries.ts`, the matching `queries.test.tsx`, `frontend/src/lib/queryClient.ts`, `frontend/src/routes.tsx`, `frontend/src/App.tsx`, `frontend/src/main.tsx`, `frontend/index.html`, `frontend/vite.config.ts`, `frontend/nginx.conf`
- Modify: `frontend/package.json` (drop deps)
- Delete (if it wraps QueryClient/MemoryRouter): `frontend/src/test/renderWithProviders.tsx`

- [ ] **Step 1: Prove no live imports remain** — grep must return nothing under `src/` except the files about to be deleted

Run:
```bash
cd frontend && grep -rn "@tanstack/react-query\|react-router-dom\|from './queries'\|from '../.*queries'\|queryClient" src --include=*.ts --include=*.tsx | grep -v "queries.test.tsx" | grep -v "/queries.ts"
```
Expected: **no output**. If anything prints, fix that file (convert it the way Tasks 1–6 did) before deleting.

- [ ] **Step 2: Delete the dead files**

```bash
cd frontend
git rm src/features/library/queries.ts src/features/library/queries.test.tsx \
       src/features/review/queries.ts src/features/review/queries.test.tsx \
       src/features/add/queries.ts src/features/add/queries.test.tsx \
       src/features/progress/queries.ts src/features/progress/queries.test.tsx \
       src/features/dashboard/queries.ts \
       src/lib/queryClient.ts src/routes.tsx src/App.tsx src/main.tsx \
       index.html vite.config.ts nginx.conf
```

(If `git rm` reports a path does not exist, drop it from the list — it was already removed. If `src/test/renderWithProviders.tsx` exists and wraps QueryClient/MemoryRouter and nothing imports it, `git rm` it too.)

- [ ] **Step 3: Drop the dependencies from `package.json`**

Remove these keys from `frontend/package.json`: `@tanstack/react-query`, `react-router-dom` (dependencies); `vite`, `@vitejs/plugin-react` (devDependencies). Leave `vitest`, `@testing-library/*`, `next`, `react`, `react-dom`, Tailwind, Zustand intact.

- [ ] **Step 4: Reinstall to refresh the lockfile**

Run: `cd frontend && npm install`
Expected: completes; `node_modules/@tanstack/react-query` and `node_modules/react-router-dom` are gone.

- [ ] **Step 5: Full suite green**

Run: `cd frontend && npx vitest run`
Expected: PASS, no unresolved-import errors. Fix any test still referencing a deleted helper.

- [ ] **Step 6: Production build sanity (Next compiles without the Vite stack)**

Run: `cd frontend && npx next build`
Expected: build succeeds; `/library`, `/review`, `/add`, `/progress`, `/login` appear in the route output.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore(frontend): remove Vite / react-router / TanStack Query stack"
```

---

## Final Verification (after all tasks)

- [ ] Every route returns 200:
```bash
for r in / /library /review /add /progress /login; do
  printf "%s " "$r"; curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000$r"
done
```
Expected: all `200`.

- [ ] No banned imports anywhere in `src/`:
```bash
cd frontend && grep -rn "@tanstack/react-query\|react-router-dom\|\bvite\b" src && echo "FOUND (bad)" || echo "clean"
```
Expected: `clean`.

- [ ] Then run the `verify` skill end-to-end (drive each screen + one write path) before opening the PR.

## Self-Review Notes (coverage vs spec)

- Spec §4.1–4.4 (4 screens) → Tasks 1–4. §5 (tour) → Task 5. §6 (auth boundary) → Task 6. §7 (cleanup) → Task 7. §8 (tests) → rewritten per task. §10 done-criteria → Final Verification.
- Kept `apiGet`/`apiPost`/`apiFetch` in `lib/api.ts` (only react-query wrappers removed) per Global Constraints.
