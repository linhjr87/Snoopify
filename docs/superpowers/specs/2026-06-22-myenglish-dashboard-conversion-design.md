# my English — Dashboard Conversion Design

**Date:** 2026-06-22
**Status:** Approved
**Source:** `myEnglish Dashboard.html` (Claude design-tool export, `dc-runtime` bundle)

## 1. Goal

Convert the self-contained static design export `myEnglish Dashboard.html` into a
working, maintainable frontend project. The export is a single `DCLogic`
component implementing a Vietnamese-language English-learning SPA ("my English").
The conversion reproduces it with **faithful behavior parity** while introducing a
proper project structure and reusable components.

## 2. Constraints (decided)

- **Stack:** Vite + React 18 + TypeScript.
- **Styling:** Tailwind CSS — theme tokens in Tailwind config, class-based dark mode.
- **State:** Zustand store with `persist` middleware → `localStorage` key `myenglish_v1`.
- **Routing:** React Router v6 — the export's `screen` value becomes the URL.
- **Scope:** Full app — all 5 screens, 3 review modes, dark mode, VN/EN i18n,
  JSON import, settings.
- **Fidelity:** Faithful behavior parity. No new logic invented (no real
  spaced-repetition engine, no backend). Seed content reproduced from the export.
- **Components:** Scaffold fresh — no pre-existing component library. Build
  reusable primitives during decomposition (Approach B: idiomatic full
  decomposition + state library + router).

## 3. What the export contains

- **Screens:** Dashboard (home), Library (decks), Review session, Add knowledge,
  Progress.
- **Review modes:** Flashcard (flip), Quiz (multiple choice), Fill-in-the-blank,
  with a spaced-repetition rating step (forgot / vague / remember).
- **Features:** dark mode, VN/EN i18n (`{ vn, en }` dictionary), deck import from
  JSON, notifications menu, language menu, settings panel (dark toggle, language,
  reset-progress with confirm), streak, calendar heatmap, bar charts.
- **State:** persisted to `localStorage` (`myenglish_v1`) via the export's
  `componentDidMount` / `componentDidUpdate`.
- **Content:** showcase data (decks, cards, stats, word-of-day, notifications) is
  currently hard-coded in markup.

## 4. Project structure

```
my-english/
  index.html
  package.json
  vite.config.ts
  tailwind.config.ts
  tsconfig.json
  src/
    main.tsx                 # entry: BrowserRouter, mount <App/>
    App.tsx                  # layout shell + <Routes>
    routes.tsx               # route table (paths -> screen components)

    components/ui/           # reusable, presentational, props-only primitives
      Card.tsx  Button.tsx  Badge.tsx  TagPill.tsx
      ProgressRing.tsx  ProgressBar.tsx  StatTile.tsx
      Heatmap.tsx  BarChart.tsx  Modal.tsx  Toggle.tsx
      SearchInput.tsx  Icon.tsx  Avatar.tsx

    components/layout/
      Sidebar.tsx  Topbar.tsx  NotificationsMenu.tsx
      LangMenu.tsx  SettingsPanel.tsx

    features/
      dashboard/  DashboardScreen.tsx
                  TodaySession.tsx  Streak.tsx  QuickAdd.tsx
                  RecentlyAdded.tsx  WordOfDay.tsx  WeekProgress.tsx
      library/    LibraryScreen.tsx  DeckList.tsx  DeckCard.tsx
                  GroupBySelector.tsx  ImportJsonModal.tsx
      review/     ReviewScreen.tsx  ModeSwitcher.tsx
                  FlashcardMode.tsx  QuizMode.tsx  FillMode.tsx
                  SpacedRepetitionRating.tsx  SessionComplete.tsx
      add/        AddScreen.tsx  AddCardForm.tsx  CardPreview.tsx
      progress/   ProgressScreen.tsx  Calendar.tsx  ReviewBars.tsx
                  MasteryLevels.tsx  NeedsReview.tsx

    store/
      useAppStore.ts         # Zustand store (state + actions) + persist
      types.ts               # Deck, Card, store types

    i18n/
      dictionary.ts          # { vn, en } strings, ported verbatim
      useT.ts                # hook -> dict[lang]

    theme/
      tokens.ts              # accent maps, light/dark palettes

    data/
      seed.ts                # showcase content as typed constants
```

### Conventions

- **Presentational vs. stateful split:** `components/ui/*` are pure and reusable;
  `features/*` wire primitives to the store and seed data.
- A screen never inlines styled markup for anything reusable — it composes
  primitives. Anything appearing on 2+ screens lives in `ui/`.

## 5. Routing

| Path | Screen |
|---|---|
| `/` | Dashboard |
| `/library` | Library |
| `/review` | Review session (mode is internal state) |
| `/add` | Add knowledge |
| `/progress` | Progress |

Sidebar navigation uses `<NavLink>`. The export's `screen` field is removed from
state and represented by the URL. The review session is a route; its
flash/quiz/fill mode stays in the store.

## 6. Component breakdown

### Reusable primitives (`components/ui/`)

| Component | Purpose | Key props |
|---|---|---|
| `Card` | Surface container (paper look) | `padding`, `as`, `className` |
| `Button` | Primary / ghost / danger | `variant`, `size`, `onClick`, `disabled` |
| `Badge` / `TagPill` | Status / topic labels | `tone`, `children` |
| `ProgressRing` | Circular progress (session 8/24) | `value`, `max`, `size`, `label` |
| `ProgressBar` | Linear progress (week, mastery) | `value`, `tone` |
| `StatTile` | Big-number stat block | `value`, `label`, `serif` |
| `Heatmap` | Calendar contribution grid | `weeks`, `scale` |
| `BarChart` | Daily review bars | `bars` |
| `Modal` | Overlay dialog | `open`, `onClose`, `title` |
| `Toggle` | Switch (dark mode) | `checked`, `onChange` |
| `SearchInput` | Search field with icon | `value`, `onChange`, `placeholder` |
| `Icon` | Inline SVG icon set | `name`, `size` |
| `Avatar` | User avatar + streak | `name`, `streak` |

### Layout (`components/layout/`)

`Sidebar` (logo, nav links, decks list, user/settings), `Topbar` (greeting,
search, notifications, language switcher), `NotificationsMenu`, `LangMenu`,
`SettingsPanel` (dark toggle, language, reset-progress with confirm).

### Feature highlights

- **Review:** `ModeSwitcher` + `FlashcardMode` (flip), `QuizMode` (choice +
  result), `FillMode` (typed answer + check), `SpacedRepetitionRating`,
  `SessionComplete` (score summary).
- **Library:** `DeckCard`, `DeckList`, `GroupBySelector` (topic / date / mastery),
  `ImportJsonModal` (file picker + paste + sample JSON).
- **Add:** `AddCardForm` (type selector + fields) with live `CardPreview`.

## 7. State, data flow & persistence

### Store shape (ported 1:1 from the export, minus `screen`)

```ts
{
  // UI / review
  reviewMode: 'flash' | 'quiz' | 'fill'
  flipped: boolean
  quizPick: number | null
  fillValue: string
  fillChecked: boolean
  // session
  sIndex: number
  sCorrect: number
  // preferences
  dark: boolean
  lang: 'vn' | 'en'
  collapsed: boolean          // sidebar collapsed
  // panels (transient, not persisted)
  settingsOpen: boolean
  confirmReset: boolean
  importOpen: boolean
  notifOpen: boolean
  langMenuOpen: boolean
  // import data
  importText: string
  importStatus: { ok: boolean; msg: string } | null
  importedDecks: Deck[]
}
```

`screen` leaves the store and becomes the URL. Every other field keeps the
export's name so parity is verifiable field-by-field.

### Actions

`setReviewMode`, `flip`, `pickQuiz`, `setFill`, `checkFill`, `advanceSession`,
`resetSession`, `toggleDark`, `setLang`, `toggleCollapsed`, panel open/close
setters, `parseAndImport(text)` (ported verbatim — JSON validation, deck append,
status message), `resetProgress`.

### Persistence

Only the export's persisted subset is written: `reviewMode, flipped, quizPick,
sIndex, sCorrect, fillValue, fillChecked, importedDecks, dark, lang, collapsed`.
Transient panel flags are excluded — matching the export's `componentDidUpdate`.
Same `localStorage` key (`myenglish_v1`) so existing saved state still loads.

### Data flow

- `data/seed.ts` holds showcase content (decks, cards, notifications,
  word-of-day, progress stats) as typed constants.
- Library shows `seedDecks` + `importedDecks`. Review reads from a fixed seed deck
  (the export's `SESSION` array). The store holds only mutable/UI state, keeping
  the export's split between static content and live state.

### i18n & theme

- `i18n/dictionary.ts` = the `{ vn, en }` object verbatim; `useT()` returns
  `dict[lang]`.
- `theme/tokens.ts` = accent maps (Evergreen / Indigo / Clay) + light/dark
  palettes, surfaced as CSS variables and Tailwind theme colors. The `dark`
  boolean toggles a `dark` class on `<html>`.

## 8. Error handling & edge cases

- **JSON import:** invalid JSON or missing required fields (`deck`,
  `cards[].word`) is caught and shown inline as `importStatus.ok = false`; cards
  without `word` are filtered; empty result is an error; success clears
  `importText` and reports deck name + count. File reads via `FileReader` surface
  the same error status.
- **localStorage:** init read and writes wrapped in try/catch — corrupt/absent
  data or quota errors fall back to defaults silently. Zustand
  `onRehydrateStorage` handles shape mismatches.
- **Session:** `advanceSession` clamps at the end and shows `SessionComplete`;
  quiz blocks rating/next until a pick; fill check disabled on empty input;
  reset-progress requires the `confirmReset` step.
- **General:** a top-level React error boundary renders a fallback instead of a
  blank page (improvement over the export's bundler-only error sink). Empty
  states for Library and notifications. TypeScript types on `Deck`/`Card`/store
  guard against shape drift.

## 9. Testing & verification

**Tooling:** Vitest + React Testing Library, jsdom.

**Unit:** `parseAndImport` (valid/invalid/missing-field/filtered/empty); store
actions (`advanceSession` clamp, `flip`/`pickQuiz`/`checkFill`, `resetProgress`,
`toggleDark`/`setLang`); persistence whitelist + corrupt-data fallback; `useT()`
per language.

**Component:** flashcard flips on click; quiz blocks rating until pick; fill check
disabled when empty; session-complete renders at end; import modal shows
error/success; reset requires confirm; dark toggle adds `dark` class.

**Manual parity check:** run the dev server, walk all 5 screens in both languages,
light/dark, all 3 review modes, and a JSON import, compared side-by-side against
the original `myEnglish Dashboard.html`.

**Done =** `npm run build` passes, `npm run test` green, dev server renders all
screens matching the export.

## 10. Out of scope

- Real spaced-repetition scheduling / review history.
- Backend, accounts, or cross-device sync.
- New screens or features beyond what the export shows.
