# Snoopify Frontend ↔ Backend Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the Snoopify Vite SPA to the real FastAPI backend via a relative `/api` proxy, add a single root entry point that boots DB + API + frontend together, and adopt TanStack Query for server-state — delivered as a runnable harness plus a working Review vertical slice.

**Architecture:** FE always calls relative `/api/*`; a proxy forwards it (Vite dev proxy when coding, nginx when containerized) and **strips the `/api` prefix** because the backend serves at root. Server-state lives in TanStack Query; UI-state stays in Zustand. Two run modes share one codebase: `docker compose up` (db + api + frontend-nginx) for test/demo, `npm run dev` (db + api in Docker + Vite HMR) for coding.

**Tech Stack:** React 18, Vite 8, TypeScript ~6, Zustand 4, `@tanstack/react-query` v5, Vitest 4 + @testing-library, FastAPI backend (existing), Docker Compose, nginx, `concurrently`.

## Global Constraints

- **Branch:** all work on `feat/frontend-integration` (already created).
- **FE never hard-codes the backend address** — always calls relative `/api/*`. Base URL = `import.meta.env.VITE_API_BASE_URL ?? '/api'`.
- **Backend serves at root** (`/review`, `/decks`, `/progress`, `/dashboard`, `/cards`, `/health`) with **no `/api` prefix** — the proxy must strip `/api`. **Do not modify the backend.**
- **Server-state → TanStack Query; UI-state → Zustand.** Do not put server data in the store.
- **TanStack Query v5 object syntax** (`useQuery({ queryKey, queryFn })`, `useMutation({ mutationFn, onSuccess })`).
- **Enum values (verbatim from backend):** `Rating = 'forgot' | 'vague' | 'remember'`; `ReviewMode = 'flash' | 'quiz' | 'fill'`.
- **UI copy stays Vietnamese.**
- **Do not break existing Vitest tests** — migrate them in the same task that changes their data source.
- **Ports:** db `5432`, api `8000`, frontend `5173` (container `5173:80`; Vite dev also `5173`).
- DRY, YAGNI, TDD, frequent commits. Commit at the end of every task.

---

## File Structure

**Phase 0 — Root orchestration (new files):**
- `frontend/Dockerfile` — multi-stage build (node build → nginx serve).
- `frontend/nginx.conf` — serve SPA + reverse-proxy `/api` (strip prefix).
- `frontend/.dockerignore`.
- `docker-compose.yml` (root) — `db`, `api`, `frontend` services.
- `.env.example` (root) — Postgres credentials with defaults.
- `package.json` (root) — `dev`/`stop` scripts via `concurrently`.
- `README.md` (root) — how to run; behavior changes.

**Phase 1 — Connection harness (new + modified):**
- `frontend/src/lib/api.ts` — typed fetch wrapper + `ApiError`.
- `frontend/src/lib/api-types.ts` — TS types mirroring backend review schemas.
- `frontend/src/lib/adapters.ts` — `toSessionItem` (API → FE view-model).
- `frontend/src/lib/queryClient.ts` — shared `QueryClient`.
- `frontend/src/test/fakeResponse.ts` — test helper.
- `frontend/src/main.tsx` — wrap app in `QueryClientProvider` (modify).
- `frontend/vite.config.ts` — dev proxy (modify).
- `frontend/package.json` — add `@tanstack/react-query` (modify).

**Phase 2 — Review vertical slice (new + modified):**
- `frontend/src/features/review/queries.ts` — `useSession`, `useGradeMutation`.
- `frontend/src/test/renderWithProviders.tsx` — render helper.
- `frontend/src/test/fixtures.ts` — review session fixture.
- `frontend/src/features/review/ReviewScreen.tsx` — use `useSession` (modify).
- `frontend/src/features/review/FlashcardMode.tsx` — grade on rate (modify).
- `frontend/src/features/review/QuizMode.tsx` — grade on next (modify).
- `frontend/src/features/review/FillMode.tsx` — grade on next (modify).
- `frontend/src/features/review/SpacedRepetitionRating.tsx` — pass rating (modify).
- `frontend/src/features/review/review.test.tsx` — mock API + providers (modify).

---

## Phase 0 — Root orchestration & containerization

### Task 1: Frontend container (Dockerfile + nginx)

**Files:**
- Create: `frontend/Dockerfile`
- Create: `frontend/nginx.conf`
- Create: `frontend/.dockerignore`

**Interfaces:**
- Produces: a frontend image that serves the built SPA on port 80 and reverse-proxies `/api/*` to `http://api:8000` with the `/api` prefix stripped.

- [ ] **Step 1: Create `frontend/nginx.conf`**

```nginx
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  # Proxy API calls to the backend; strip the /api prefix because the
  # backend serves its routes at root (/review, /decks, ...).
  location /api/ {
    rewrite ^/api/(.*)$ /$1 break;
    proxy_pass http://api:8000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  # SPA history fallback.
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

- [ ] **Step 2: Create `frontend/Dockerfile`**

```dockerfile
# Build stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine AS runner
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 3: Create `frontend/.dockerignore`**

```
node_modules
dist
.git
*.log
```

- [ ] **Step 4: Verify the image builds**

Run: `docker build -t snoopify-frontend ./frontend`
Expected: build completes; final line `naming to docker.io/library/snoopify-frontend`. (Requires Docker Desktop running.)

- [ ] **Step 5: Commit**

```bash
git add frontend/Dockerfile frontend/nginx.conf frontend/.dockerignore
git commit -m "build(frontend): nginx Dockerfile serving SPA + /api proxy"
```

---

### Task 2: Root docker-compose

**Files:**
- Create: `docker-compose.yml`
- Create: `.env.example`

**Interfaces:**
- Consumes: `./backend` (existing Dockerfile, WORKDIR `/code`), `./frontend` (Task 1).
- Produces: `docker compose up` boots `db` + `api` + `frontend`; `docker compose up db api` boots only the backing services for dev.

- [ ] **Step 1: Create `.env.example`**

```dotenv
POSTGRES_USER=snoopify
POSTGRES_PASSWORD=snoopify
POSTGRES_DB=snoopify
```

- [ ] **Step 2: Create `docker-compose.yml`**

```yaml
services:
  db:
    image: postgres:16
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-snoopify}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-snoopify}
      POSTGRES_DB: ${POSTGRES_DB:-snoopify}
    ports:
      - "5432:5432"
    volumes:
      - snoopify_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-snoopify}"]
      interval: 5s
      timeout: 3s
      retries: 5

  api:
    build: ./backend
    command: sh -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
    environment:
      DATABASE_URL: postgresql+asyncpg://${POSTGRES_USER:-snoopify}:${POSTGRES_PASSWORD:-snoopify}@db:5432/${POSTGRES_DB:-snoopify}
      SEED_ON_STARTUP: "true"
      CORS_ORIGINS: '["http://localhost:5173"]'
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/code
    depends_on:
      db:
        condition: service_healthy

  frontend:
    build: ./frontend
    ports:
      - "5173:80"
    depends_on:
      - api

volumes:
  snoopify_pgdata:
```

- [ ] **Step 3: Verify compose config is valid**

Run: `docker compose config`
Expected: prints the resolved config with `db`, `api`, `frontend` services and no errors.

- [ ] **Step 4: Commit**

```bash
git add docker-compose.yml .env.example
git commit -m "build: root docker-compose for db + api + frontend"
```

---

### Task 3: Root dev orchestration + README

**Files:**
- Create: `package.json` (repo root)
- Create: `README.md` (repo root)

**Interfaces:**
- Produces: `npm run dev` at root runs `docker compose up db api` and Vite dev concurrently; `npm run stop` tears compose down.

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "snoopify",
  "private": true,
  "scripts": {
    "dev": "concurrently -k -n api,web -c blue,green \"docker compose up db api\" \"npm --prefix frontend run dev\"",
    "stop": "docker compose down"
  },
  "devDependencies": {
    "concurrently": "^9.1.0"
  }
}
```

- [ ] **Step 2: Install root dev dependency**

Run: `npm install`
Expected: creates root `node_modules/` + `package-lock.json` with `concurrently`.

- [ ] **Step 3: Create root `README.md`**

````markdown
# Snoopify

Vietnamese-language English flashcard app. React + Vite frontend, FastAPI +
PostgreSQL backend with SM-2 spaced repetition.

## Run the whole system (test/demo)

```bash
cp .env.example .env        # first time only
docker compose up           # db + api + frontend
```
Open http://localhost:5173 — the frontend talks to the API through nginx at
`/api`. The API seeds a starter deck on first boot.

## Develop with hot reload

```bash
npm install                 # first time only (installs concurrently)
docker compose up db api    # or: npm run dev  (runs this + Vite together)
npm --prefix frontend run dev
```
Vite serves http://localhost:5173 with HMR and proxies `/api` to the API on
`localhost:8000`.

## Notes

- The frontend always calls relative `/api/*`; the proxy (Vite in dev, nginx in
  the container) forwards it and strips the `/api` prefix (the backend serves at
  root).
- After wiring to the real API, the old display-only showcase decks are gone;
  the Library shows real decks (seeded starter deck + imported). Dashboard/
  progress numbers are now real and start small until you review.
- Session counters are no longer persisted across reloads; the server's SM-2
  schedule decides what is due.
````

- [ ] **Step 4: Verify the dev script is wired**

Run: `npm run dev -- --help` is not meaningful; instead verify the script exists:
`npm run` and confirm `dev` and `stop` are listed.
Expected: output lists `dev` and `stop` scripts.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json README.md
git commit -m "build: root npm scripts (concurrently) + README"
```

---

## Phase 1 — FE connection harness

### Task 4: TanStack Query setup + Vite proxy

**Files:**
- Modify: `frontend/package.json` (add dependency)
- Create: `frontend/src/lib/queryClient.ts`
- Modify: `frontend/src/main.tsx`
- Modify: `frontend/vite.config.ts`

**Interfaces:**
- Produces: `queryClient` (exported `QueryClient`); app wrapped in `QueryClientProvider`; dev proxy mapping `/api` → `http://localhost:8000` with prefix stripped.

- [ ] **Step 1: Install React Query**

Run: `cd frontend && npm install @tanstack/react-query@^5`
Expected: `@tanstack/react-query` added to `dependencies` in `frontend/package.json`.

- [ ] **Step 2: Create `frontend/src/lib/queryClient.ts`**

```ts
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
})
```

- [ ] **Step 3: Wrap the app in `frontend/src/main.tsx`**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import { ErrorBoundary } from './ErrorBoundary'
import { queryClient } from './lib/queryClient'
import './index.css'
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary><BrowserRouter><App /></BrowserRouter></ErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>,
)
```

- [ ] **Step 4: Add the dev proxy in `frontend/vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api/, ''),
      },
    },
  },
})
```

- [ ] **Step 5: Verify build + existing tests still pass**

Run: `cd frontend && npm run build && npm test`
Expected: TypeScript build succeeds; all existing Vitest tests pass.

- [ ] **Step 6: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/lib/queryClient.ts frontend/src/main.tsx frontend/vite.config.ts
git commit -m "feat(frontend): add React Query provider + Vite /api proxy"
```

---

### Task 5: Typed API client (`lib/api.ts`)

**Files:**
- Create: `frontend/src/lib/api.ts`
- Create: `frontend/src/test/fakeResponse.ts`
- Test: `frontend/src/lib/api.test.ts`

**Interfaces:**
- Produces:
  - `class ApiError extends Error { status: number; detail: unknown }`
  - `apiGet<T>(path: string): Promise<T>`
  - `apiPost<T>(path: string, body?: unknown): Promise<T>`
  - `apiPatch<T>(path: string, body?: unknown): Promise<T>`
  - `apiDelete<T>(path: string): Promise<T>`
  - `fakeResponse(body: unknown, status?: number): Response` (test helper)

- [ ] **Step 1: Create the test helper `frontend/src/test/fakeResponse.ts`**

```ts
// Minimal stand-in for a fetch Response — only the fields api.ts reads.
export function fakeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    json: async () => body,
  } as unknown as Response
}
```

- [ ] **Step 2: Write the failing test `frontend/src/lib/api.test.ts`**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { apiGet, apiPost, ApiError } from './api'
import { fakeResponse } from '../test/fakeResponse'

afterEach(() => { vi.restoreAllMocks() })

describe('api client', () => {
  it('apiGet returns parsed JSON on 200', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => fakeResponse({ hello: 'world' }, 200)))
    const data = await apiGet<{ hello: string }>('/thing')
    expect(data).toEqual({ hello: 'world' })
  })

  it('apiPost sends a JSON body with method POST', async () => {
    const spy = vi.fn(async () => fakeResponse({ ok: true }, 200))
    vi.stubGlobal('fetch', spy)
    await apiPost('/grade', { a: 1 })
    const init = spy.mock.calls[0][1] as RequestInit
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ a: 1 }))
  })

  it('throws ApiError carrying status + detail on non-OK', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => fakeResponse({ detail: 'nope' }, 400)))
    await expect(apiGet('/x')).rejects.toMatchObject({ status: 400, detail: 'nope' })
    await expect(apiGet('/x')).rejects.toBeInstanceOf(ApiError)
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/lib/api.test.ts`
Expected: FAIL — `Failed to resolve import './api'` (file does not exist yet).

- [ ] **Step 4: Implement `frontend/src/lib/api.ts`**

```ts
const BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api'

export class ApiError extends Error {
  constructor(public status: number, public detail: unknown) {
    super(typeof detail === 'string' ? detail : `HTTP ${status}`)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
    ...options,
  })
  if (!res.ok) {
    let detail: unknown = res.statusText
    try { detail = (await res.json()).detail ?? detail } catch { /* non-JSON body */ }
    throw new ApiError(res.status, detail)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const apiGet = <T>(path: string) => request<T>(path)
export const apiPost = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })
export const apiPatch = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'PATCH', body: body === undefined ? undefined : JSON.stringify(body) })
export const apiDelete = <T>(path: string) => request<T>(path, { method: 'DELETE' })
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/lib/api.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/test/fakeResponse.ts frontend/src/lib/api.test.ts
git commit -m "feat(frontend): typed fetch client + ApiError"
```

---

### Task 6: API types + Review adapter

**Files:**
- Create: `frontend/src/lib/api-types.ts`
- Create: `frontend/src/lib/adapters.ts`
- Test: `frontend/src/lib/adapters.test.ts`

**Interfaces:**
- Consumes: `SessionItem` (existing, from `src/data/seed.ts`).
- Produces:
  - Types `ReviewItemOut`, `QuizOut`, `QuizOptionOut`, `FillOut`, `GradeRequest`, `GradeResult`, `Rating`, `ReviewMode`.
  - `type SessionCard = SessionItem & { cardId: string }`
  - `toSessionItem(api: ReviewItemOut): SessionCard`

- [ ] **Step 1: Create `frontend/src/lib/api-types.ts`**

```ts
// Mirrors backend Pydantic schemas (app/schemas/review.py, app/enums.py).
export interface QuizOptionOut { key: string; text: string }
export interface QuizOut { options: QuizOptionOut[]; correct_key: string }
export interface FillOut { before: string; after: string; answer: string; hint: string }

export interface ReviewItemOut {
  card_id: string
  word: string
  phonetic: string
  pos: string
  meaning: string
  example: string
  quiz: QuizOut
  fill: FillOut
}

export type Rating = 'forgot' | 'vague' | 'remember'
export type ReviewMode = 'flash' | 'quiz' | 'fill'

export interface GradeRequest {
  card_id: string
  rating: Rating
  mode: ReviewMode
  is_correct?: boolean | null
}

export interface GradeResult {
  card_id: string
  ease_factor: number
  interval_days: number
  repetitions: number
  lapses: number
  due_at: string
  last_reviewed_at: string
}
```

- [ ] **Step 2: Write the failing test `frontend/src/lib/adapters.test.ts`**

```ts
import { describe, it, expect } from 'vitest'
import { toSessionItem } from './adapters'
import type { ReviewItemOut } from './api-types'

const sample: ReviewItemOut = {
  card_id: 'c1', word: 'resilient', phonetic: '/rɪˈzɪl.i.ənt/', pos: 'adjective',
  meaning: 'có khả năng phục hồi nhanh', example: 'She is so resilient.',
  quiz: {
    options: [
      { key: 'A', text: 'a' }, { key: 'B', text: 'b' },
      { key: 'C', text: 'c' }, { key: 'D', text: 'd' },
    ],
    correct_key: 'B',
  },
  fill: { before: 'She is', after: '.', answer: 'resilient', hint: 'r________' },
}

describe('toSessionItem', () => {
  it('joins phonetic and pos into phon', () => {
    expect(toSessionItem(sample).phon).toBe('/rɪˈzɪl.i.ənt/ · adjective')
  })
  it('carries cardId and maps quiz options to tuples + correct key', () => {
    const r = toSessionItem(sample)
    expect(r.cardId).toBe('c1')
    expect(r.quiz.correct).toBe('B')
    expect(r.quiz.options[1]).toEqual(['B', 'b'])
  })
  it('omits the separator when pos is empty', () => {
    expect(toSessionItem({ ...sample, pos: '' }).phon).toBe('/rɪˈzɪl.i.ənt/')
  })
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/lib/adapters.test.ts`
Expected: FAIL — `Failed to resolve import './adapters'`.

- [ ] **Step 4: Implement `frontend/src/lib/adapters.ts`**

```ts
import type { ReviewItemOut } from './api-types'
import type { SessionItem } from '../data/seed'

export type SessionCard = SessionItem & { cardId: string }

export function toSessionItem(api: ReviewItemOut): SessionCard {
  return {
    cardId: api.card_id,
    word: api.word,
    phon: [api.phonetic, api.pos].filter(Boolean).join(' · '),
    meaning: api.meaning,
    example: api.example,
    quiz: {
      correct: api.quiz.correct_key,
      options: api.quiz.options.map((o) => [o.key, o.text] as [string, string]),
    },
    fill: {
      before: api.fill.before,
      after: api.fill.after,
      answer: api.fill.answer,
      hint: api.fill.hint,
    },
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/lib/adapters.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/api-types.ts frontend/src/lib/adapters.ts frontend/src/lib/adapters.test.ts
git commit -m "feat(frontend): review API types + session adapter"
```

---

### Task 7: Review query hooks

**Files:**
- Create: `frontend/src/features/review/queries.ts`
- Test: `frontend/src/features/review/queries.test.tsx`

**Interfaces:**
- Consumes: `apiGet`, `apiPost` (Task 5); `toSessionItem`, `SessionCard`, `ReviewItemOut`, `GradeRequest`, `GradeResult` (Task 6).
- Produces:
  - `useSession(deckId?: string, limit?: number)` → React Query result with `data: SessionCard[]`.
  - `useGradeMutation()` → mutation taking `GradeRequest`, returning `GradeResult`; invalidates `['progress']` and `['decks']` on success.

- [ ] **Step 1: Write the failing test `frontend/src/features/review/queries.test.tsx`**

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useSession, useGradeMutation } from './queries'
import { fakeResponse } from '../../test/fakeResponse'

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

afterEach(() => { vi.restoreAllMocks() })

describe('useSession', () => {
  it('fetches /review/session and adapts the items', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => fakeResponse([{
      card_id: 'c1', word: 'w', phonetic: '/p/', pos: 'noun', meaning: 'm', example: 'e',
      quiz: { options: [
        { key: 'A', text: 'a' }, { key: 'B', text: 'b' },
        { key: 'C', text: 'c' }, { key: 'D', text: 'd' }], correct_key: 'A' },
      fill: { before: 'b', after: 'a', answer: 'w', hint: 'w' },
    }])))
    const { result } = renderHook(() => useSession(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0].cardId).toBe('c1')
    expect(result.current.data?.[0].phon).toBe('/p/ · noun')
  })
})

describe('useGradeMutation', () => {
  it('POSTs the grade to /review/grade', async () => {
    const spy = vi.fn(async () => fakeResponse({
      card_id: 'c1', ease_factor: 2.5, interval_days: 1, repetitions: 1,
      lapses: 0, due_at: '2026-06-23T00:00:00Z', last_reviewed_at: '2026-06-22T00:00:00Z',
    }))
    vi.stubGlobal('fetch', spy)
    const { result } = renderHook(() => useGradeMutation(), { wrapper: makeWrapper() })
    await result.current.mutateAsync({ card_id: 'c1', rating: 'remember', mode: 'flash', is_correct: null })
    expect(String(spy.mock.calls[0][0])).toContain('/review/grade')
    expect((spy.mock.calls[0][1] as RequestInit).method).toBe('POST')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/features/review/queries.test.tsx`
Expected: FAIL — `Failed to resolve import './queries'`.

- [ ] **Step 3: Implement `frontend/src/features/review/queries.ts`**

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../lib/api'
import type { ReviewItemOut, GradeRequest, GradeResult } from '../../lib/api-types'
import { toSessionItem, type SessionCard } from '../../lib/adapters'

export function useSession(deckId?: string, limit = 20) {
  return useQuery({
    queryKey: ['review', 'session', deckId ?? null, limit],
    queryFn: async (): Promise<SessionCard[]> => {
      const qs = new URLSearchParams()
      if (deckId) qs.set('deck_id', deckId)
      qs.set('limit', String(limit))
      const items = await apiGet<ReviewItemOut[]>(`/review/session?${qs.toString()}`)
      return items.map(toSessionItem)
    },
  })
}

export function useGradeMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: GradeRequest) => apiPost<GradeResult>('/review/grade', req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['progress'] })
      qc.invalidateQueries({ queryKey: ['decks'] })
    },
  })
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/features/review/queries.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/review/queries.ts frontend/src/features/review/queries.test.tsx
git commit -m "feat(frontend): useSession + useGradeMutation hooks"
```

---

## Phase 2 — Review vertical slice

### Task 8: Wire the Review screen + modes to the API

This task changes the Review components together because they must compile as a
unit (the modes now receive `SessionCard` and call the grade mutation), and it
migrates `review.test.tsx` to drive the screen from a mocked API.

**Files:**
- Create: `frontend/src/test/renderWithProviders.tsx`
- Create: `frontend/src/test/fixtures.ts`
- Modify: `frontend/src/features/review/SpacedRepetitionRating.tsx`
- Modify: `frontend/src/features/review/FlashcardMode.tsx`
- Modify: `frontend/src/features/review/QuizMode.tsx`
- Modify: `frontend/src/features/review/FillMode.tsx`
- Modify: `frontend/src/features/review/ReviewScreen.tsx`
- Modify (rewrite): `frontend/src/features/review/review.test.tsx`

**Interfaces:**
- Consumes: `useSession`, `useGradeMutation` (Task 7); `SessionCard` (Task 6); `Rating` (Task 6).
- Produces:
  - `renderWithProviders(ui: ReactElement)` — wraps in `QueryClientProvider` + `MemoryRouter`.
  - `reviewSessionFixture: ReviewItemOut[]` (5 cards).
  - `SpacedRepetitionRating` `onRate` signature becomes `(rating: Rating) => void`.
  - `FlashcardMode`/`QuizMode`/`FillMode` accept `cur: SessionCard`.

- [ ] **Step 1: Create `frontend/src/test/renderWithProviders.tsx`**

```tsx
import { type ReactElement } from 'react'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

export function renderWithProviders(ui: ReactElement) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}
```

- [ ] **Step 2: Create `frontend/src/test/fixtures.ts`**

```ts
import type { ReviewItemOut } from '../lib/api-types'

// Mirrors the 5 seed cards, shaped as the /review/session response.
export const reviewSessionFixture: ReviewItemOut[] = [
  {
    card_id: 'c1', word: 'resilient', phonetic: '/rɪˈzɪl.i.ənt/', pos: 'adjective',
    meaning: 'có khả năng phục hồi nhanh; kiên cường',
    example: 'She is so resilient — she bounced back within a week.',
    quiz: { options: [
      { key: 'A', text: 'dễ vỡ, mong manh' },
      { key: 'B', text: 'có khả năng phục hồi nhanh' },
      { key: 'C', text: 'cứng nhắc, không linh hoạt' },
      { key: 'D', text: 'hào phóng, rộng lượng' }], correct_key: 'B' },
    fill: { before: 'The economy proved remarkably', after: ', recovering faster than anyone expected.', answer: 'resilient', hint: 'r________' },
  },
  {
    card_id: 'c2', word: 'serendipity', phonetic: '/ˌser.ənˈdɪp.ə.ti/', pos: 'noun',
    meaning: 'sự tình cờ may mắn; duyên may bất ngờ',
    example: 'Finding that little café was pure serendipity.',
    quiz: { options: [
      { key: 'A', text: 'sự xui xẻo' },
      { key: 'B', text: 'sự cẩn thận' },
      { key: 'C', text: 'sự tình cờ may mắn' },
      { key: 'D', text: 'sự tức giận' }], correct_key: 'C' },
    fill: { before: 'Finding that little café was pure', after: '.', answer: 'serendipity', hint: 's__________' },
  },
  {
    card_id: 'c3', word: 'meticulous', phonetic: '/məˈtɪk.jə.ləs/', pos: 'adjective',
    meaning: 'tỉ mỉ, kỹ lưỡng, cẩn thận',
    example: 'He kept meticulous records of every transaction.',
    quiz: { options: [
      { key: 'A', text: 'tỉ mỉ, cẩn thận' },
      { key: 'B', text: 'cẩu thả' },
      { key: 'C', text: 'hào phóng' },
      { key: 'D', text: 'vội vàng' }], correct_key: 'A' },
    fill: { before: 'He kept', after: 'records of every transaction.', answer: 'meticulous', hint: 'm_________' },
  },
  {
    card_id: 'c4', word: 'ambiguous', phonetic: '/æmˈbɪɡ.ju.əs/', pos: 'adjective',
    meaning: 'mơ hồ, nước đôi, đa nghĩa',
    example: 'The instructions were ambiguous and confusing.',
    quiz: { options: [
      { key: 'A', text: 'rõ ràng' },
      { key: 'B', text: 'chính xác' },
      { key: 'C', text: 'ngắn gọn' },
      { key: 'D', text: 'mơ hồ, đa nghĩa' }], correct_key: 'D' },
    fill: { before: 'The instructions were', after: 'and confusing.', answer: 'ambiguous', hint: 'a________' },
  },
  {
    card_id: 'c5', word: 'put off', phonetic: '', pos: 'phrasal verb',
    meaning: 'trì hoãn, hoãn lại',
    example: "Don't put off until tomorrow what you can do today.",
    quiz: { options: [
      { key: 'A', text: 'hoàn thành' },
      { key: 'B', text: 'trì hoãn' },
      { key: 'C', text: 'bắt đầu' },
      { key: 'D', text: 'tăng tốc' }], correct_key: 'B' },
    fill: { before: "Don't", after: 'until tomorrow what you can do today.', answer: 'put off', hint: 'p__ o__' },
  },
]
```

- [ ] **Step 3: Rewrite the test `frontend/src/features/review/review.test.tsx` (failing)**

```tsx
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReviewScreen from './ReviewScreen'
import { useAppStore, initialState } from '../../store/useAppStore'
import { renderWithProviders } from '../../test/renderWithProviders'
import { reviewSessionFixture } from '../../test/fixtures'
import { fakeResponse } from '../../test/fakeResponse'

function mockApi() {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/review/session')) return fakeResponse(reviewSessionFixture)
    if (url.includes('/review/grade')) return fakeResponse({
      card_id: 'c1', ease_factor: 2.5, interval_days: 1, repetitions: 1,
      lapses: 0, due_at: '2026-06-23T00:00:00Z', last_reviewed_at: '2026-06-22T00:00:00Z',
    })
    return fakeResponse({ detail: 'not mocked' }, 404)
  }))
}

describe('ReviewScreen', () => {
  beforeEach(() => { localStorage.clear(); useAppStore.setState({ ...initialState }); mockApi() })
  afterEach(() => { vi.restoreAllMocks() })

  it('flashcard flips to show meaning', async () => {
    renderWithProviders(<ReviewScreen />)
    expect(await screen.findByText('resilient')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Nhấn để lật thẻ'))
    expect(screen.getByText('có khả năng phục hồi nhanh; kiên cường')).toBeInTheDocument()
  })

  it('quiz shows result after a pick', async () => {
    useAppStore.setState({ reviewMode: 'quiz' })
    renderWithProviders(<ReviewScreen />)
    await screen.findByText('resilient')
    await userEvent.click(screen.getByText('có khả năng phục hồi nhanh'))
    expect(screen.getByText(/Chính xác/)).toBeInTheDocument()
  })

  it('fill check is disabled until input has value', async () => {
    useAppStore.setState({ reviewMode: 'fill' })
    renderWithProviders(<ReviewScreen />)
    await screen.findByText(/Gõ từ còn thiếu/)
    expect(screen.getByText('Kiểm tra')).toBeDisabled()
    await userEvent.type(screen.getByLabelText('fill'), 'resilient')
    expect(screen.getByText('Kiểm tra')).toBeEnabled()
  })

  it('shows session complete when index past end', async () => {
    useAppStore.setState({ sIndex: 5, sCorrect: 4 })
    renderWithProviders(<ReviewScreen />)
    expect(await screen.findByText('Hoàn thành phiên')).toBeInTheDocument()
    expect(screen.getByText(/câu đúng/)).toBeInTheDocument()
  })

  it('shows an empty state when there are no due cards', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => fakeResponse([])))
    renderWithProviders(<ReviewScreen />)
    expect(await screen.findByText(/Không có thẻ nào đến hạn/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/features/review/review.test.tsx`
Expected: FAIL — ReviewScreen still imports `SESSION`; no loading/empty handling; `findByText('resilient')` times out or the empty-state text is missing.

- [ ] **Step 5: Update `frontend/src/features/review/SpacedRepetitionRating.tsx`**

```tsx
import type { Rating } from '../../lib/api-types'

export function SpacedRepetitionRating({ onRate }: { onRate: (rating: Rating) => void }) {
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
          onClick={() => onRate(rating)}
          style={{
            border: `1px solid ${borderColor}`,
            color: textColor,
            borderRadius: '12px',
            background: 'var(--surface)',
            padding: '12px 24px',
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'background .15s ease',
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

- [ ] **Step 6: Update `frontend/src/features/review/FlashcardMode.tsx`**

Change the type import and wire grading. Replace the import line `import type { SessionItem } from '../../data/seed'` and the rating handler; keep all JSX/styles identical except the `cur` type and the `SpacedRepetitionRating` callback.

Replace the top imports and signature:

```tsx
import { useAppStore } from '../../store/useAppStore'
import { SpacedRepetitionRating } from './SpacedRepetitionRating'
import type { SessionCard } from '../../lib/adapters'
import type { Rating } from '../../lib/api-types'
import { useGradeMutation } from './queries'

export function FlashcardMode({ cur }: { cur: SessionCard }) {
  const flipped = useAppStore((s) => s.flipped)
  const flip = useAppStore((s) => s.flip)
  const advance = useAppStore((s) => s.advanceSession)
  const grade = useGradeMutation()

  const handleRate = (rating: Rating) => {
    grade.mutate({ card_id: cur.cardId, rating, mode: 'flash', is_correct: null })
    advance(rating !== 'forgot')
  }
```

Then replace the rating line near the bottom:

```tsx
      {/* Rating buttons */}
      <SpacedRepetitionRating onRate={handleRate} />
```

(Leave the rest of the component — the card markup and styles — unchanged.)

- [ ] **Step 7: Update `frontend/src/features/review/QuizMode.tsx`**

Replace the top imports/signature and the Next button handler.

Top:

```tsx
import { useAppStore } from '../../store/useAppStore'
import { quizIsRight } from '../../lib/grading'
import type { SessionCard } from '../../lib/adapters'
import { useGradeMutation } from './queries'

export function QuizMode({ cur, isLast }: { cur: SessionCard; isLast: boolean }) {
  const pick = useAppStore((s) => s.quizPick)
  const pickQuiz = useAppStore((s) => s.pickQuiz)
  const advance = useAppStore((s) => s.advanceSession)
  const grade = useGradeMutation()
  const answered = pick != null
  const right = quizIsRight(pick, cur.quiz.correct)

  const handleNext = () => {
    grade.mutate({ card_id: cur.cardId, rating: right ? 'remember' : 'forgot', mode: 'quiz', is_correct: right })
    advance(right)
  }
```

Then change the Next button's handler from `onClick={() => advance(right)}` to:

```tsx
          <button
            onClick={handleNext}
```

(Leave the rest of the component unchanged.)

- [ ] **Step 8: Update `frontend/src/features/review/FillMode.tsx`**

Top:

```tsx
import { useAppStore } from '../../store/useAppStore'
import { fillIsRight } from '../../lib/grading'
import type { SessionCard } from '../../lib/adapters'
import { useGradeMutation } from './queries'

export function FillMode({ cur, isLast }: { cur: SessionCard; isLast: boolean }) {
  const value = useAppStore((s) => s.fillValue)
  const checked = useAppStore((s) => s.fillChecked)
  const setFill = useAppStore((s) => s.setFill)
  const checkFill = useAppStore((s) => s.checkFill)
  const advance = useAppStore((s) => s.advanceSession)
  const grade = useGradeMutation()
  const right = fillIsRight(value, cur.fill.answer)

  const handleNext = () => {
    grade.mutate({ card_id: cur.cardId, rating: right ? 'remember' : 'forgot', mode: 'fill', is_correct: right })
    advance(right)
  }
```

Change the Enter handler to use `handleNext`:

```tsx
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (checked) { handleNext() }
      else if (value.trim()) { checkFill() }
    }
  }
```

And change the result-banner Next button from `onClick={() => advance(right)}` to `onClick={handleNext}`. (Leave the rest unchanged.)

- [ ] **Step 9: Update `frontend/src/features/review/ReviewScreen.tsx`**

```tsx
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import { ModeSwitcher } from './ModeSwitcher'
import { FlashcardMode } from './FlashcardMode'
import { QuizMode } from './QuizMode'
import { FillMode } from './FillMode'
import { SessionComplete } from './SessionComplete'
import { useSession } from './queries'

function ReviewMessage({ text, onHome }: { text: string; onHome?: () => void }) {
  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
      <div style={{ fontSize: '17px' }}>{text}</div>
      {onHome && (
        <button
          className="ghost"
          onClick={onHome}
          style={{
            marginTop: '20px', border: '1px solid var(--line)', borderRadius: '11px',
            background: 'var(--surface)', padding: '10px 20px',
            fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, color: 'var(--muted)', cursor: 'pointer',
          }}
        >
          Về trang chủ
        </button>
      )}
    </div>
  )
}

export default function ReviewScreen() {
  const t = useT()
  const nav = useNavigate()
  const reviewMode = useAppStore((s) => s.reviewMode)
  const sIndex = useAppStore((s) => s.sIndex)
  const sCorrect = useAppStore((s) => s.sCorrect)
  const { data, isLoading, isError } = useSession()

  if (isLoading) return <ReviewMessage text="Đang tải phiên ôn tập…" />
  if (isError) return <ReviewMessage text="Không tải được phiên ôn tập. Thử lại sau." onHome={() => nav('/')} />

  const session = data ?? []
  const total = session.length

  if (total === 0) return <ReviewMessage text="Không có thẻ nào đến hạn ôn tập. Quay lại sau nhé!" onHome={() => nav('/')} />
  if (sIndex >= total) return <SessionComplete correct={sCorrect} total={total} />

  const cur = session[sIndex]
  const isLast = sIndex >= total - 1
  const progressPct = Math.round((sIndex / total) * 100)

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', animation: 'fadeUp .45s ease both' }}>
      {/* Progress row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
        <button
          className="ghost"
          onClick={() => nav('/')}
          style={{
            border: '1px solid var(--line)', borderRadius: '9px', background: 'var(--surface)',
            padding: '7px 12px', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: '13px',
            color: 'var(--muted)', cursor: 'pointer',
          }}
        >
          {t.exit}
        </button>
        <div style={{ flex: 1, height: '8px', borderRadius: '999px', background: 'var(--track)', overflow: 'hidden' }}>
          <div style={{
            width: progressPct + '%', height: '100%', background: 'var(--accent,#2f5d4e)',
            borderRadius: '999px', transition: 'width .4s cubic-bezier(.2,.8,.2,1)',
          }} />
        </div>
        <div style={{ fontFamily: 'var(--num-font)', fontSize: '15px', fontWeight: 600, color: 'var(--muted)' }}>
          {Math.min(sIndex + 1, total)} / {total}
        </div>
      </div>

      {/* Session label + score */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', marginBottom: '20px' }}>
        <span style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Đến hạn hôm nay
        </span>
        <span style={{ fontSize: '12px', color: 'var(--accent,#2f5d4e)', fontWeight: 700 }}>
          · {sCorrect} đúng
        </span>
      </div>

      {/* Mode switcher */}
      <div style={{ display: 'flex', gap: '9px', justifyContent: 'center', marginBottom: '24px' }}>
        <ModeSwitcher />
      </div>

      {/* Active mode */}
      {reviewMode === 'flash' && <FlashcardMode cur={cur} />}
      {reviewMode === 'quiz' && <QuizMode cur={cur} isLast={isLast} />}
      {reviewMode === 'fill' && <FillMode cur={cur} isLast={isLast} />}
    </div>
  )
}
```

- [ ] **Step 10: Run the Review tests to verify they pass**

Run: `cd frontend && npx vitest run src/features/review/review.test.tsx`
Expected: PASS (5 tests).

- [ ] **Step 11: Run the full frontend test suite + build**

Run: `cd frontend && npm test && npm run build`
Expected: all tests pass; TypeScript build succeeds. (If another screen's test imported `SpacedRepetitionRating` with the old boolean `onRate`, fix that call to pass a `Rating` — search: `cd frontend && grep -rn "onRate" src`.)

- [ ] **Step 12: Commit**

```bash
git add frontend/src/test/renderWithProviders.tsx frontend/src/test/fixtures.ts frontend/src/features/review/
git commit -m "feat(frontend): wire Review screen + modes to the live API"
```

---

### Task 9: End-to-end manual verification

**Files:** none (verification only).

**Interfaces:**
- Consumes: everything above. Confirms the full system runs and grading persists.

- [ ] **Step 1: Boot the whole system**

Run: `cp .env.example .env` (if no `.env` yet), then `docker compose up --build`
Expected: `db` becomes healthy, `api` runs `alembic upgrade head` then uvicorn and seeds the starter deck, `frontend` (nginx) starts.

- [ ] **Step 2: Verify the API is reachable through the nginx proxy**

Run: `curl -s http://localhost:5173/api/health`
Expected: `{"status":"ok"}` (proxied: `/api/health` → backend `/health`).

- [ ] **Step 3: Verify the Review flow in the browser**

Open `http://localhost:5173`, go to **Ôn tập** (Review). Confirm 5 due cards
load (the seeded starter deck), flip a flashcard, rate it, and reach the
session-complete screen.

- [ ] **Step 4: Verify grading persisted**

Run: `curl -s http://localhost:5173/api/progress/summary`
Expected: `reviews_today` ≥ 1 (reflects the cards you just graded), confirming
the grade reached the DB.

- [ ] **Step 5: Verify the dev (HMR) path**

Run: `docker compose down`, then `npm install` (root, once), then `npm run dev`.
Open `http://localhost:5173`; confirm Vite serves with HMR and the Review screen
still loads cards through the `/api` proxy.

- [ ] **Step 6: Commit (docs only, if you captured notes)**

No code change. If you adjusted the README during verification:

```bash
git add README.md
git commit -m "docs: verification notes for FE↔BE integration"
```

---

## Follow-up plans (not in this plan)

Each remaining screen repeats the Task 6–8 pattern (types → adapter → query
hook → swap the seed seam) and is a separate plan, written after this harness is
validated. Each also carries the relevant store/persist trimming from spec §6:

1. **Library + JSON import** — `GET /decks`, `GET /decks/{id}/cards`, `POST
   /decks/import`; remove `seedDecks`/`DeckVM`; move `importedDecks` /
   `parseAndImport` out of the store; trim `persist` to UI prefs only.
2. **Add card** — `POST /decks/{id}/cards`.
3. **Dashboard** — `GET /dashboard/word-of-day`, `GET /cards/recent`, `GET
   /progress/summary`.
4. **Progress + Settings reset** — `GET /progress/heatmap`, `GET
   /progress/summary`, `GET /progress/needs-review`, `POST /progress/reset`.

---

## Self-Review

**Spec coverage (spec → task):**
- §4 root orchestration → Tasks 1–3. ✓
- §5 connection layer (vite proxy, api.ts, api-types) → Tasks 4–6. ✓
- §6 data layer (React Query, queryClient, adapters, query hooks) → Tasks 4, 6, 7. Store/persist trim → deferred to Follow-up plan 1 (the store's server-state is consumed by Library/import, not Review, so trimming it here would break the un-migrated Library screen). Noted, not a gap.
- §7 Review vertical slice → Task 8; end-to-end → Task 9. ✓
- §9 behavior changes (label, empty state, no persisted counters) → Task 8 (neutral "Đến hạn hôm nay" label, empty state) + README (Task 3). ✓
- §10 testing (`renderWithProviders`, mocked fetch, migrated `review.test.tsx`) → Tasks 7–8. ✓
- §8 expansion screens → Follow-up plans (each "working software on its own"). ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code; verification steps give exact commands + expected output. ✓

**Type consistency:** `SessionCard` (Task 6) is consumed by the modes (Task 8). `Rating`/`ReviewMode` literals (Task 6) used in `GradeRequest` and `SpacedRepetitionRating`/modes. `useSession`/`useGradeMutation` signatures (Task 7) match their call sites (Task 8). `fakeResponse` (Task 5) reused in Tasks 7–8. `apiGet`/`apiPost` (Task 5) used by queries (Task 7). ✓
