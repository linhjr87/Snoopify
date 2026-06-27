# CLAUDE.md — Frontend

Guidance for Claude Code when working in `frontend/`. For the full-stack picture
(BFF rewrite, end-to-end auth/session flow, request lifecycle) see the root
[`../CLAUDE.md`](../CLAUDE.md).

## Stack

Next.js 15 (App Router, `output: standalone`) · React 18 · TypeScript (strict) · Zustand 4 ·
Tailwind 3 · Vitest 4 + Testing Library (jsdom). **No path aliases — relative imports only**
(`../store/useAppStore`); `moduleResolution: bundler`.

## Commands (run from `frontend/`, or prefix `npm --prefix frontend`)

- `npm run dev` — Next dev on :3000 (expects the API on :8000; root `npm run dev` starts both)
- `npm run build` · `npm run start` · `npm run lint` (eslint-config-next)
- `npm run test` (Vitest) · `npm run test:watch`. Single file/test:
  `npm run test -- src/lib/grading.test.ts` · by name `npm run test -- -t "grades a lapse"`

## Two API clients — pick by component type

- **Client Components** → `src/lib/api.ts`: `apiGet/apiPost/apiPatch/apiDelete` hit relative
  `/api/*` and throw `ApiError(status, detail)` on non-2xx (204 → `undefined`).
- **Server Components** → `src/lib/api-server.ts`: `apiFetch(path)` is `server-only`, hits
  `BACKEND_URL` directly and forwards the `sid` cookie. Wrap calls with
  `.catch(orRedirect(fallback))` so a 401 bounces to `/api/signout`. The root layout loads
  `/auth/me`, `/progress/summary`, `/decks` this way.
- `src/lib/api-types.ts` mirrors backend Pydantic schemas; `src/lib/adapters.ts` maps API
  DTOs → view models. Don't call `fetch` directly in components — go through these.

## State (Zustand, `src/store/`)

- `useAppStore` holds ephemeral UI + review-session state (review mode, flip, quiz pick, fill
  input, session counters) plus prefs. **Only `dark`, `lang`, `collapsed` persist**
  (localStorage key `snoopify_v1`, via `partialize`). Dark mode is applied imperatively
  through `theme/tokens.ts::applyTheme` on toggle and on rehydrate — don't toggle the `dark`
  class anywhere else.
- `useTourStore` drives the guided onboarding tour.

## Conventions

- Components PascalCase (`DeckList.tsx`); hooks/utils camelCase (`useT.ts`, `api.ts`).
  Feature-first: a feature's UI + logic live together in `src/features/<feature>/`; shared
  primitives in `src/components/ui/`, app shell in `src/components/layout/`.
- Tests co-located as `*.test.ts(x)`; setup in `src/setupTests.ts`. Vitest globals are on, so
  `describe/it/expect` need no import.
- **i18n is mandatory** — no hardcoded UI copy. Add the key to BOTH `vn` and `en` in
  `src/i18n/dictionary.ts` and read it via `useT()`. `lang` defaults to `vn` (Vietnamese-first).
- Route auth is enforced once in `src/middleware.ts` (redirects to `/login` when the `sid`
  cookie is absent) — individual pages don't re-check.
