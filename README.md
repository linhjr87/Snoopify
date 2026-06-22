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
