# Snoopify — Wire Real Streak + Decks into Sidebar

**Date:** 2026-06-26
**Status:** Approved (design)
**Depends on:** `fix/i18n-username-display` (commit `88c5f11`, fast-forwarded into
this branch — no divergent history). That commit added the `displayName` prop
chain (`layout.tsx` → `AppShell` → `Sidebar`) and the `t.streakLabel`/
`t.myMistakesDeck`/`t.guestLabel` i18n keys this design builds on directly.

## 1. Goal

`Sidebar.tsx`'s user footer shows a hardcoded `t.streakLabel(12)` instead of the
user's real streak, and its Decks section hardcodes two fake deck names plus a
non-functional "my mistakes" row instead of the user's real decks. Both are
mockup leftovers never wired to the backend, even though the data they need
(`/progress/summary`, `/decks`) already exists and is fetched correctly
elsewhere (`Streak.tsx`, `ProgressScreen.tsx`, `LibraryScreen.tsx`).

## 2. Decisions

| Aspect | Decision |
|---|---|
| Where data is fetched | `frontend/src/app/layout.tsx` (root, async Server Component), alongside the existing `/auth/me` call. |
| Fetch style | Soft-fail (`.catch(() => null)` / `.catch(() => [])`), **not** `orRedirect` — matches the existing `/auth/me` call, since this layout also wraps `/login`. |
| Duplicate-fetch concern | Not a real concern: Next 15 App Router's Request Memoization dedupes identical `fetch` calls within one request regardless of `cache: 'no-store'`. Dashboard/progress/library pages already fetch `/progress/summary` / `/decks`; those become free dedups. Only `/add`, `/review`, `/login` gain a genuinely new (necessary) fetch. |
| Prop shape for streak | `summary: ProgressSummary \| null` (the whole object), not a pre-extracted number — matches the existing convention in `Streak.tsx` / `ProgressScreen.tsx`. `Sidebar` derives `streak = summary?.streak ?? 0` itself. |
| Prop shape for decks | `decks: DeckOut[]` (reuse the existing type as-is, no new "lightweight" type) — `Sidebar` slices/sorts what it needs internally. |
| Decks shown | Top 3 by `last_reviewed_at` descending (nulls sort last), `localeCompare` on the ISO string — same technique `LibraryScreen` already uses for its date sort. |
| Overflow | If `decks.length > 3`, show a "View all →" row (reuses existing `t.viewAll` key) that routes to `/library`. |
| Empty state | If `decks.length === 0`, show the existing `t.noDeckYet` string in place of the list. |
| "My mistakes" row | Not backed by any real deck or backend concept (confirmed: no mistakes-deck route/model exists). Per product decision: **keep it as a static, non-data row** (unchanged visually), but wire `onClick` → `router.push('/progress')`, since lapsed-card data already surfaces there via `needs-review`. |
| Deck row click | Each real deck row routes to `/library` (general — no per-deck deep link exists on the frontend today; building one is out of scope). |
| New i18n keys | None — `viewAll` and `noDeckYet` already exist in the dictionary. |
| New types | None — reuse `ProgressSummary` and `DeckOut` from `lib/api-types.ts`. |

## 3. Data flow

```
layout.tsx (Server Component)
  Promise.all([
    apiFetch<{display_name,email}>('/auth/me').catch(() => null),      // existing
    apiFetch<ProgressSummary>('/progress/summary').catch(() => null),  // new
    apiFetch<DeckOut[]>('/decks').catch(() => [] as DeckOut[]),        // new
  ])
  → <AppShell displayName={me?.display_name} summary={summary} decks={decks}>

AppShell (client)
  { children, displayName, summary, decks }
  → <Sidebar displayName={displayName} summary={summary} decks={decks} />

Sidebar (client)
  const streak = summary?.streak ?? 0
  const recentDecks = useMemo(() =>
    [...decks].sort(by last_reviewed_at desc, nulls last).slice(0, 3), [decks])
```

No change to `app/page.tsx`, `library/page.tsx`, or `progress/page.tsx` — they
keep fetching their own data independently; Next's request memoization
collapses the duplicate calls to `/progress/summary` and `/decks` into one
network round-trip per request.

## 4. Sidebar rendering changes

- Streak line: `t.streakLabel(12)` → `t.streakLabel(streak)`.
- Decks section: render `recentDecks`, each row = colored dot (cycle the two
  existing mockup colors, `var(--accent,#2f5d4e)` / `#c9a23a`, by index) + deck
  name, `onClick={() => router.push('/library')}`.
- "View all →" row appended only when `decks.length > 3`.
- Empty state (`t.noDeckYet`) shown only when `decks.length === 0`.
- "My mistakes" row: unchanged markup, add `onClick={() => router.push('/progress')}`.
- The "my mistakes" row is unconditional, so the `data-tour="decks"` container
  never collapses to zero height even when `decks` is empty — preserving the
  guided-tour rect fix from the parent commit (`08280fe`).

## 5. Testing

New `frontend/src/components/layout/Sidebar.test.tsx` (none exists today):
- Real streak number renders via `t.streakLabel`.
- Decks render sorted by recency, capped at 3.
- "View all" link appears only when `decks.length > 3` and navigates to `/library`.
- Empty-decks state renders `t.noDeckYet`, "my mistakes" row still present.
- Clicking a deck row navigates to `/library`.
- Clicking the "my mistakes" row navigates to `/progress`.

No test added for `layout.tsx` itself — consistent with this repo's existing
convention of not unit-testing async Server Component data-fetching glue
(no `page.tsx`/`layout.tsx` test files exist today; only presentational
components are tested, with data passed as props/mocked fetch).

## 6. Out of scope

- Per-deck deep links from the sidebar into `LibraryScreen` (would require a
  new route/query-param convention not in the current frontend).
- A real "mistakes" feature/endpoint — the row stays a static shortcut.
- Backend pagination/limit on `GET /decks` — sidebar slicing is client-side.
- Retrofitting `RecentlyAdded.tsx`'s already-decorative "View all" link (a
  pre-existing, unrelated gap) — not touched by this change.

## 7. Done criteria

1. Sidebar shows the authenticated user's real streak count, not `12`.
2. Sidebar Decks section shows up to 3 of the user's real decks, sorted by
   recency, with a working "View all" link when there are more than 3.
3. Empty-decks state renders without collapsing the tour anchor.
4. "My mistakes" row navigates to `/progress`; deck rows navigate to `/library`.
5. `Sidebar.test.tsx` covers the above; full existing suite stays green;
   `tsc --noEmit` clean.
