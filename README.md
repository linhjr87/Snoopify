# Snoopify

Vietnamese-language English flashcard app. React + Vite frontend, FastAPI +
PostgreSQL backend with SM-2 spaced repetition.

The instructions below describe the completed frontend/backend integration.

## Run the whole system (test/demo)

```bash
cp .env.example .env        # first time only
docker compose up           # db + api + frontend
```
Open http://localhost:5173 — the frontend talks to the API through nginx at
`/api`. The API seeds a starter deck on first boot.

## Develop with hot reload

Install both the root tooling and frontend dependencies after a fresh clone:

```bash
npm install
npm --prefix frontend ci
```

Then either start the full development stack with one command:

```bash
npm run dev
```

Or run its two parts in separate terminals:

```bash
# Terminal 1
docker compose up db api

# Terminal 2
npm --prefix frontend run dev
```

Vite serves http://localhost:5173 with HMR. In the completed integration it
proxies `/api` to the API on `localhost:8000`.

## Notes

- The frontend always calls relative `/api/*`; the proxy (Vite in dev, nginx in
  the container) forwards it and strips the `/api` prefix (the backend serves at
  root).
- Review loads due cards from the real API, and grading persists the server's
  SM-2 scheduling updates.
- Other screens remain outside this integration slice.
