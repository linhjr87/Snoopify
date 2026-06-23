# Snoopify Polish & Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the two real Review robustness gaps and harden the nginx → api proxy, before the whole branch merges.

**Architecture:** Final follow-up of the FE↔BE integration on branch `feat/frontend-integration`. Two FE fixes (grade invalidates the session cache; flashcard rating buttons can't double-submit) plus one ops fix (nginx resolves its upstream at request time). No backend change.

**Tech Stack:** React 18, `@tanstack/react-query` v5, Vitest + @testing-library; nginx (containerized frontend); Docker Compose.

## Global Constraints

- **Branch:** `feat/frontend-integration`.
- Scope is exactly three items (selected with the user): **M1** invalidate `['review','session']` after a grade; **M2** prevent flashcard double-grade via `grade.isPending`; **nginx** runtime upstream resolution. Everything else (api.ts Content-Type, apiPatch/apiDelete tests, UX polish, dashboard live date) is explicitly OUT of scope.
- M2 is scoped to `FlashcardMode` only — Quiz/Fill hide their "Next" button after `advanceSession` resets the answered state, so they cannot double-submit.
- React Query v5 object syntax. Keep `npm run build` (tsc -b) green and the full Vitest suite passing. UI copy stays Vietnamese. TDD, commit per task.

---

## File Structure

- **Task 1 (M1):** `frontend/src/features/review/queries.ts`, `frontend/src/features/review/queries.test.tsx`.
- **Task 2 (M2):** `frontend/src/features/review/SpacedRepetitionRating.tsx`, `frontend/src/features/review/FlashcardMode.tsx`, `frontend/src/features/review/SpacedRepetitionRating.test.tsx` (new).
- **Task 3 (nginx):** `frontend/nginx.conf`.

---

## Task 1: Grade invalidates the review session cache (M1)

After a grade, the just-graded card is no longer due, but `useSession` keeps the stale cached list (`staleTime` 30s), so "Học lại" / the next session replays already-graded cards. Invalidate `['review']` on success.

**Files:**
- Modify: `frontend/src/features/review/queries.ts`
- Modify: `frontend/src/features/review/queries.test.tsx`

**Interfaces:**
- Produces: `useGradeMutation().onSuccess` additionally invalidates `['review']` (covers the `['review','session',...]` keys).

- [ ] **Step 1: Extend the invalidation test in `frontend/src/features/review/queries.test.tsx`**

In the existing test `it('invalidates progress and decks on success', ...)`, add one assertion after the two existing `toHaveBeenCalledWith` lines (around line 65):

```tsx
    expect(spy).toHaveBeenCalledWith({ queryKey: ['review'] })
```

Also rename the test title to reflect it (optional but clearer):

```tsx
  it('invalidates progress, decks and review on success', async () => {
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npx vitest run src/features/review/queries.test.tsx -t "invalidates"`
Expected: FAIL — `invalidateQueries` was never called with `{ queryKey: ['review'] }`.

- [ ] **Step 3: Add the invalidation in `frontend/src/features/review/queries.ts`**

In `useGradeMutation`, inside `onSuccess`, add the `['review']` invalidation alongside the existing two:

```ts
    onSuccess: () => {
      useAppStore.getState().setGradeError(false)
      qc.invalidateQueries({ queryKey: ['progress'] })
      qc.invalidateQueries({ queryKey: ['decks'] })
      qc.invalidateQueries({ queryKey: ['review'] })
    },
```

(The `onError` handler and `mutationFn` are unchanged.)

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/features/review/queries.test.tsx`
Expected: PASS (all tests in the file).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/review/queries.ts frontend/src/features/review/queries.test.tsx
git commit -m "fix(frontend): invalidate review session cache after grading"
```

---

## Task 2: Guard against flashcard double-grade (M2)

`SpacedRepetitionRating`'s buttons stay visible across cards, so a rapid double-click can POST two grades. Add a `disabled` prop and wire it to `grade.isPending` in `FlashcardMode`.

**Files:**
- Modify: `frontend/src/features/review/SpacedRepetitionRating.tsx`
- Modify: `frontend/src/features/review/FlashcardMode.tsx`
- Create: `frontend/src/features/review/SpacedRepetitionRating.test.tsx`

**Interfaces:**
- Consumes: `Rating` (lib/api-types), `useGradeMutation().isPending` (review queries).
- Produces: `SpacedRepetitionRating` accepts `disabled?: boolean`; when disabled, its buttons are `disabled` and `onRate` is not called.

- [ ] **Step 1: Write the failing test `frontend/src/features/review/SpacedRepetitionRating.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SpacedRepetitionRating } from './SpacedRepetitionRating'

describe('SpacedRepetitionRating', () => {
  it('calls onRate with the chosen rating when enabled', async () => {
    const onRate = vi.fn()
    render(<SpacedRepetitionRating onRate={onRate} />)
    await userEvent.click(screen.getByText('Nhớ'))
    expect(onRate).toHaveBeenCalledWith('remember')
  })

  it('does not call onRate when disabled', async () => {
    const onRate = vi.fn()
    render(<SpacedRepetitionRating onRate={onRate} disabled />)
    await userEvent.click(screen.getByText('Nhớ'))
    expect(onRate).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `cd frontend && npx vitest run src/features/review/SpacedRepetitionRating.test.tsx`
Expected: FAIL — the second test fails because the component ignores `disabled` (buttons fire `onRate` regardless). (TypeScript also flags the unknown `disabled` prop.)

- [ ] **Step 3: Add the `disabled` prop in `frontend/src/features/review/SpacedRepetitionRating.tsx`** (full file)

```tsx
import type { Rating } from '../../lib/api-types'

export function SpacedRepetitionRating({ onRate, disabled = false }: { onRate: (rating: Rating) => void; disabled?: boolean }) {
  const opts: [string, string, Rating, string, string][] = [
    ['Quên', 'ôn lại ngay', 'forgot', 'var(--rust)', 'var(--rust)'],
    ['Mơ hồ', 'sau 1 ngày', 'vague', 'var(--gold)', 'var(--gold)'],
    ['Nhớ', 'sau 4 ngày', 'remember', '#3f8f5b', '#2f6b43'],
  ]
  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
      {opts.map(([label, sub, rating, borderColor, textColor]) => (
        <button
          key={label}
          disabled={disabled}
          onClick={() => onRate(rating)}
          style={{
            border: `1px solid ${borderColor}`,
            color: textColor,
            borderRadius: '12px',
            background: 'var(--surface)',
            padding: '12px 24px',
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontWeight: 600,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            textAlign: 'center',
            transition: 'background .15s ease, opacity .15s ease',
          }}
        >
          {label}
          <div style={{ fontSize: '12px', fontWeight: 400, color: 'var(--muted)', marginTop: '2px' }}>
            {sub}
          </div>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run the component test to verify it passes**

Run: `cd frontend && npx vitest run src/features/review/SpacedRepetitionRating.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire `grade.isPending` in `frontend/src/features/review/FlashcardMode.tsx`**

Change only the `SpacedRepetitionRating` usage (line ~80) to pass `disabled`:

```tsx
      {/* Rating buttons */}
      <SpacedRepetitionRating onRate={handleRate} disabled={grade.isPending} />
```

(`grade` is already `useGradeMutation()` in this component; `handleRate` and everything else are unchanged.)

- [ ] **Step 6: Run the full suite + build**

Run: `cd frontend && npm test && npm run build`
Expected: all tests pass (existing `review.test.tsx` still green — the flashcard mock grade resolves so buttons aren't stuck disabled); tsc build succeeds.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/review/SpacedRepetitionRating.tsx frontend/src/features/review/SpacedRepetitionRating.test.tsx frontend/src/features/review/FlashcardMode.tsx
git commit -m "fix(frontend): disable flashcard rating while a grade is in flight"
```

---

## Task 3: nginx resolves its upstream at request time

`proxy_pass http://api:8000;` resolves `api` once at nginx startup. If the api container is recreated with a new IP without restarting nginx, the proxy 502s until nginx restarts. Use Docker's embedded DNS resolver + a variable so the name is re-resolved per request.

**Files:**
- Modify: `frontend/nginx.conf`

**Interfaces:** none (ops config). Verification is via Docker.

- [ ] **Step 1: Update `frontend/nginx.conf`** (full file)

```nginx
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        # Docker's embedded DNS; re-resolve the upstream at request time so the
        # proxy survives the api container being recreated with a new IP.
        resolver 127.0.0.11 valid=10s;
        set $api_upstream http://api:8000;
        rewrite ^/api/(.*)$ /$1 break;
        proxy_pass $api_upstream;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 2: Rebuild the frontend image and boot the stack**

(Requires Docker Desktop running, and the old `backend/docker-compose.yml` db NOT occupying port 5432 — stop `backend-db-1` first if needed.)

Run: `docker compose up -d --build frontend api db`
Expected: containers start; `db` healthy, `api` up, `frontend` up.

- [ ] **Step 3: Verify the proxy still works through nginx**

Run (wait for api, then hit the proxy): `curl -s --retry 20 --retry-delay 2 --retry-connrefused -o /dev/null -w "%{http_code}\n" http://localhost:5173/api/health`
Expected: `200`.

- [ ] **Step 4: Verify the resilience the change buys — recreate api, proxy recovers without restarting nginx**

```bash
docker compose up -d --force-recreate --no-deps api
sleep 12   # api restarts + resolver TTL (10s) expires
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/api/health
```
Expected: `200` — nginx re-resolved the api container's new IP (with the old static `proxy_pass` this returned `502`).

- [ ] **Step 5: Tear down (restore the environment)**

Run: `docker compose down` (and `docker start backend-db-1` if you stopped it in Step 2).

- [ ] **Step 6: Commit**

```bash
git add frontend/nginx.conf
git commit -m "fix(ops): nginx re-resolves the api upstream at request time"
```

---

## Self-Review

**Spec coverage (requirement → task):**
- M1 — grade invalidates `['review']` (so the session refetches and drops graded cards) → Task 1. ✓
- M2 — flashcard rating disabled while `grade.isPending` (no double-POST); Quiz/Fill excluded (Next hides post-advance) → Task 2. ✓
- nginx runtime upstream resolution (`resolver` + variable `proxy_pass`) → Task 3, with a recreate-api resilience check. ✓
- Out-of-scope items (api.ts, UX polish) correctly excluded — see Global Constraints. ✓

**Placeholder scan:** No TBD/TODO; complete code in every code step; exact commands + expected output (Docker steps flagged as requiring Docker). ✓

**Type consistency:** `SpacedRepetitionRating` gains `disabled?: boolean` (Task 2) and its only caller `FlashcardMode` passes `grade.isPending` (Task 2, same task). `useGradeMutation` (Task 1) keeps its signature; only `onSuccess` grows one invalidation. No new symbols referenced across tasks. ✓

**Note:** After this plan, all five screens are wired and the known robustness/ops gaps are closed — the branch is ready for `superpowers:finishing-a-development-branch` (the PR already exists, base `feat/backend`).
