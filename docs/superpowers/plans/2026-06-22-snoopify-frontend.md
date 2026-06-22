# Snoopify Frontend Conversion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the static `myEnglish Dashboard.html` design export into a working, maintainable React frontend ("Snoopify") with faithful behavior parity.

**Architecture:** A client-only SPA. Screens are React Router routes; all live/UI state lives in a single Zustand store persisted to `localStorage`; showcase content is typed seed data; theming and i18n are token/dictionary modules. Reusable presentational primitives in `components/ui/` are composed by feature screens.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS, Zustand, React Router v6, Vitest + React Testing Library + jsdom.

## Global Constraints

- App lives in `frontend/`. `backend/` is created as an empty placeholder only (README stating it is unimplemented).
- User-facing brand name is **Snoopify** (sidebar logo, page `<title>`). App content, user name "Minh", greetings, deck/card text are unchanged from the export.
- `localStorage` key is `snoopify_v1`.
- Persisted state subset ONLY: `reviewMode, flipped, quizPick, sIndex, sCorrect, fillValue, fillChecked, importedDecks, dark, lang, collapsed`. Transient panel flags (`settingsOpen, confirmReset, importOpen, importText, importStatus, notifOpen, langMenuOpen`) are NOT persisted.
- The export's `screen` field is removed from state and represented by the URL.
- Theming via CSS custom properties + Tailwind; light/dark via a `dark` class on `<html>`. Accent options: Evergreen (default) `#2f5d4e`, Indigo `#3c4a86`, Clay `#9c5a3c`.
- Fonts: 'Hanken Grotesk' (UI), 'Newsreader' serif (numbers when `serifNumbers` true). Load via Google Fonts.
- **Source of truth for visual layout:** the rendered markup inside `myEnglish Dashboard.html` (the `<x-dc>` template region). When a task says "port layout from the export", extract the corresponding section and translate inline styles to Tailwind classes using the tokens from Task 2.
- TDD for all logic (store actions, parsing, i18n, helpers). Commit after every task.

---

## File Structure

```
frontend/
  index.html                 # title "Snoopify", font links, #root
  package.json  vite.config.ts  tsconfig.json  tailwind.config.ts  postcss.config.js
  vitest.config.ts  src/setupTests.ts
  src/
    main.tsx                 # BrowserRouter + <App/>
    App.tsx                  # layout shell + <Routes> + ErrorBoundary
    routes.tsx               # path -> screen element table
    index.css                # Tailwind directives + CSS-var base (light/dark)
    ErrorBoundary.tsx
    theme/tokens.ts          # accent maps, light/dark palettes, font stacks
    i18n/dictionary.ts       # { vn, en } strings (verbatim)
    i18n/useT.ts             # hook -> dict[lang]
    store/types.ts           # Card, Deck, AppState, AppActions
    store/useAppStore.ts     # Zustand store + persist
    data/seed.ts             # decks, SESSION, notifications, wordOfDay, progress, weeklyBars, makeHeatmap
    lib/grading.ts           # norm(), quiz/fill result helpers
    components/ui/*.tsx       # Card Button Badge TagPill ProgressRing ProgressBar StatTile Heatmap BarChart Modal Toggle SearchInput Icon Avatar
    components/layout/*.tsx   # Sidebar Topbar NotificationsMenu LangMenu SettingsPanel
    features/dashboard/*.tsx
    features/library/*.tsx
    features/review/*.tsx
    features/add/*.tsx
    features/progress/*.tsx
backend/
  README.md                  # placeholder
```

---

## Task 1: Scaffold frontend project + tooling

**Files:**
- Create: `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/tsconfig.node.json`, `frontend/index.html`, `frontend/postcss.config.js`, `frontend/tailwind.config.ts`, `frontend/src/index.css`, `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/vitest.config.ts`, `frontend/src/setupTests.ts`
- Create: `backend/README.md`

**Interfaces:**
- Produces: a running Vite dev server and a passing `npm run test` harness for later tasks.

- [ ] **Step 1: Create the frontend app via Vite**

Run from repo root `D:/CHRIS/RESEARCH/LEARN-EN`:
```bash
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
npm install zustand react-router-dom
npm install -D tailwindcss postcss autoprefixer vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom
```

- [ ] **Step 2: Configure Tailwind**

`frontend/postcss.config.js`:
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
```

`frontend/tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss'
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        paper: 'var(--paper)', surface: 'var(--surface)', ink: 'var(--ink)',
        muted: 'var(--muted)', line: 'var(--line)', track: 'var(--track)',
        accent: 'var(--accent)', 'accent-soft': 'var(--accent-soft)', rust: 'var(--rust)',
      },
      fontFamily: {
        sans: ["'Hanken Grotesk'", 'sans-serif'],
        serif: ["'Newsreader'", 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
```

- [ ] **Step 3: Base CSS with Tailwind + default theme vars**

`frontend/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --paper:#f6f4ee; --surface:#fffdf9; --ink:#211f1b; --muted:#6f6a61;
  --line:#e8e3d8; --track:#ece7da; --rust:#9c5a3c;
  --accent:#2f5d4e; --accent-soft:#e7efea;
}
html.dark {
  --paper:#191712; --surface:#221f18; --ink:#efe9df; --muted:#a39b8d;
  --line:#36322a; --track:#322e26;
}
body { margin:0; background:var(--paper); color:var(--ink); font-family:'Hanken Grotesk',sans-serif; }
```

- [ ] **Step 4: index.html — brand title + fonts**

Set `frontend/index.html` `<title>` to `Snoopify` and add inside `<head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,400;6..72,500&display=swap" rel="stylesheet">
```

- [ ] **Step 5: Vitest config + setup**

`frontend/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: './src/setupTests.ts' },
})
```
`frontend/src/setupTests.ts`:
```ts
import '@testing-library/jest-dom'
```
Add to `frontend/package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 6: Minimal App + main importing index.css**

`frontend/src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
```
`frontend/src/App.tsx`:
```tsx
export default function App() { return <div>Snoopify</div> }
```

- [ ] **Step 7: Backend placeholder**

`backend/README.md`:
```markdown
# Snoopify Backend (placeholder)

Not implemented yet. The backend is specced and built separately, after the
frontend. See docs/superpowers/specs for the frontend design.
```

- [ ] **Step 8: Verify build + dev + test**

Run in `frontend/`:
```bash
npm run build
npm run test
```
Expected: build succeeds; `vitest run` reports "No test files found" (exit 0) — acceptable at this stage.

- [ ] **Step 9: Commit**

```bash
git add frontend backend
git commit -m "chore: scaffold Snoopify frontend (Vite+React+TS+Tailwind) and backend placeholder"
```

---

## Task 2: Theme tokens module

**Files:**
- Create: `frontend/src/theme/tokens.ts`
- Test: `frontend/src/theme/tokens.test.ts`

**Interfaces:**
- Produces: `ACCENTS: Record<AccentName,{accent:string;soft:string}>`, `LIGHT`/`DARK` palette objects, `applyTheme(dark:boolean, accent:AccentName):void` (sets CSS vars + `dark` class on `document.documentElement`), `AccentName` type.

- [ ] **Step 1: Write the failing test**

`frontend/src/theme/tokens.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { ACCENTS, applyTheme } from './tokens'

describe('tokens', () => {
  beforeEach(() => { document.documentElement.className = ''; document.documentElement.removeAttribute('style') })
  it('exposes Evergreen default accent', () => {
    expect(ACCENTS.Evergreen.accent).toBe('#2f5d4e')
  })
  it('applyTheme(true) adds dark class and sets accent var', () => {
    applyTheme(true, 'Indigo')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.style.getPropertyValue('--accent')).toBe('#3c4a86')
  })
  it('applyTheme(false) removes dark class', () => {
    applyTheme(true, 'Evergreen'); applyTheme(false, 'Evergreen')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tokens`
Expected: FAIL — cannot resolve `./tokens`.

- [ ] **Step 3: Implement tokens**

`frontend/src/theme/tokens.ts`:
```ts
export type AccentName = 'Evergreen' | 'Indigo' | 'Clay'

export const ACCENTS: Record<AccentName, { accent: string; soft: string }> = {
  Evergreen: { accent: '#2f5d4e', soft: '#e7efea' },
  Indigo:    { accent: '#3c4a86', soft: '#e9ebf6' },
  Clay:      { accent: '#9c5a3c', soft: '#f3e9e2' },
}

export const LIGHT = { paper:'#f6f4ee', surface:'#fffdf9', ink:'#211f1b', muted:'#6f6a61', line:'#e8e3d8', track:'#ece7da' }
export const DARK  = { paper:'#191712', surface:'#221f18', ink:'#efe9df', muted:'#a39b8d', line:'#36322a', track:'#322e26' }

export function applyTheme(dark: boolean, accent: AccentName = 'Evergreen'): void {
  const root = document.documentElement
  root.classList.toggle('dark', dark)
  const pal = dark ? DARK : LIGHT
  for (const [k, v] of Object.entries(pal)) root.style.setProperty(`--${k}`, v)
  const a = ACCENTS[accent] ?? ACCENTS.Evergreen
  root.style.setProperty('--accent', a.accent)
  root.style.setProperty('--accent-soft', dark ? `color-mix(in srgb, ${a.accent} 26%, ${pal.surface})` : a.soft)
  root.style.setProperty('--rust', '#9c5a3c')
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tokens`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/theme
git commit -m "feat: theme tokens and applyTheme"
```

---

## Task 3: Types

**Files:**
- Create: `frontend/src/store/types.ts`

**Interfaces:**
- Produces: `Card`, `Deck`, `ReviewMode`, `Lang`, `ImportStatus`, `AppState`, `AppActions`, `AppStore` types consumed by store, seed, and components.

- [ ] **Step 1: Write the types**

`frontend/src/store/types.ts`:
```ts
export type ReviewMode = 'flash' | 'quiz' | 'fill'
export type Lang = 'vn' | 'en'

export interface Card { word: string; phonetic: string; pos: string; meaning: string; example: string }
export interface Deck { name: string; topic: string; count: number; cards: Card[] }
export interface ImportStatus { ok: boolean; msg: string }

export interface AppState {
  reviewMode: ReviewMode
  flipped: boolean
  quizPick: string | null
  fillValue: string
  fillChecked: boolean
  sIndex: number
  sCorrect: number
  dark: boolean
  lang: Lang
  collapsed: boolean
  settingsOpen: boolean
  confirmReset: boolean
  importOpen: boolean
  notifOpen: boolean
  langMenuOpen: boolean
  importText: string
  importStatus: ImportStatus | null
  importedDecks: Deck[]
}

export interface AppActions {
  setReviewMode(mode: ReviewMode): void
  flip(): void
  pickQuiz(key: string): void
  setFill(value: string): void
  checkFill(): void
  advanceSession(correct: boolean): void
  resetSession(): void
  toggleDark(): void
  setLang(lang: Lang): void
  toggleCollapsed(): void
  setPanel(panel: 'settingsOpen' | 'confirmReset' | 'importOpen' | 'notifOpen' | 'langMenuOpen', open: boolean): void
  setImportText(text: string): void
  parseAndImport(text: string): void
  resetProgress(): void
}

export type AppStore = AppState & AppActions
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/store/types.ts
git commit -m "feat: app domain types"
```

---

## Task 4: i18n dictionary + useT hook

**Files:**
- Create: `frontend/src/i18n/dictionary.ts`, `frontend/src/i18n/useT.ts`
- Test: `frontend/src/i18n/useT.test.tsx`

**Interfaces:**
- Consumes: `Lang` (Task 3), store (Task 6 — test stubs store read).
- Produces: `dict: Record<Lang, Strings>`, `Strings` type, `useT(): Strings` hook reading `lang` from the store.

- [ ] **Step 1: Implement the dictionary (verbatim from export)**

`frontend/src/i18n/dictionary.ts`:
```ts
import type { Lang } from '../store/types'

export const dict = {
  vn: { learn:'Học tập', decks:'Bộ thẻ', home:'Trang chủ', library:'Thư viện', review:'Ôn tập', add:'Thêm kiến thức', progress:'Tiến độ',
    settings:'Cài đặt', resetProgress:'Đặt lại tiến độ', resetConfirm:'Xoá toàn bộ tiến độ, điểm và phiên đang học?', deleteAll:'Xoá hết', cancel:'Huỷ',
    darkMode:'Chế độ tối', language:'Ngôn ngữ',
    greeting:'Chào buổi sáng, Minh.', searchPh:'tìm từ, cụm từ, ghi chú…',
    todaySession:'Phiên ôn tập hôm nay', startReview:'Bắt đầu ôn tập', addTitle:'Thêm kiến thức', importJson:'Nhập từ JSON', newDeck:'+ Bộ thẻ mới',
    progressTitle:'Tiến độ học tập', libraryTitle:'Thư viện', exit:'✕ Thoát', flashcard:'Flashcard', quiz:'Trắc nghiệm', fill:'Điền từ',
    notif:'Thông báo', notifEmpty:'Không có thông báo mới', markRead:'Đánh dấu đã đọc',
    n1:'24 thẻ đến hạn ôn hôm nay', n1t:'Vài phút trước', n2:'Chuỗi 12 ngày — đừng để đứt nhé!', n2t:'Hôm nay', n3:'Từ của ngày: “serendipity”', n3t:'Hôm nay', collapse:'Thu gọn' },
  en: { learn:'Learn', decks:'Decks', home:'Home', library:'Library', review:'Review', add:'Add knowledge', progress:'Progress',
    settings:'Settings', resetProgress:'Reset progress', resetConfirm:'Erase all progress, scores and the current session?', deleteAll:'Erase all', cancel:'Cancel',
    darkMode:'Dark mode', language:'Language',
    greeting:'Good morning, Minh.', searchPh:'search words, phrases, notes…',
    todaySession:"Today's review session", startReview:'Start review', addTitle:'Add knowledge', importJson:'Import JSON', newDeck:'+ New deck',
    progressTitle:'Learning progress', libraryTitle:'Library', exit:'✕ Exit', flashcard:'Flashcard', quiz:'Quiz', fill:'Fill in',
    notif:'Notifications', notifEmpty:'No new notifications', markRead:'Mark as read',
    n1:'24 cards due for review today', n1t:'A few minutes ago', n2:'12-day streak — keep it alive!', n2t:'Today', n3:'Word of the day: “serendipity”', n3t:'Today', collapse:'Collapse' },
} as const

export type Strings = typeof dict[Lang]
```

- [ ] **Step 2: Write the failing test**

`frontend/src/i18n/useT.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useT } from './useT'
import { useAppStore } from '../store/useAppStore'

function Probe() { const t = useT(); return <span>{t.home}</span> }

describe('useT', () => {
  it('returns VN strings by default', () => {
    useAppStore.setState({ lang: 'vn' })
    render(<Probe />)
    expect(screen.getByText('Trang chủ')).toBeInTheDocument()
  })
  it('returns EN strings when lang=en', () => {
    useAppStore.setState({ lang: 'en' })
    render(<Probe />)
    expect(screen.getByText('Home')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2b: Implement useT**

`frontend/src/i18n/useT.ts`:
```ts
import { dict, type Strings } from './dictionary'
import { useAppStore } from '../store/useAppStore'
export function useT(): Strings { return dict[useAppStore((s) => s.lang)] }
```

- [ ] **Step 3: Run test (after Task 6 store exists) to verify pass**

Run: `npm run test -- useT`
Expected: PASS. (Note: this test depends on Task 6's store; if executing strictly in order, run it at the end of Task 6.)

- [ ] **Step 4: Commit**

```bash
git add frontend/src/i18n
git commit -m "feat: i18n dictionary and useT hook"
```

---

## Task 5: Seed data + grading helpers

**Files:**
- Create: `frontend/src/data/seed.ts`, `frontend/src/lib/grading.ts`
- Test: `frontend/src/lib/grading.test.ts`

**Interfaces:**
- Consumes: `Card`, `Deck` (Task 3).
- Produces: `seedDecks: DeckCardVM[]`, `SESSION: SessionItem[]`, `notifications`, `wordOfDay`, `weeklyBars`, `mastery`, `needsReview`, `makeHeatmap(): number[]` from `data/seed.ts`; `norm(v:string):string`, `quizIsRight(pick,correct)`, `fillIsRight(value,answer)` from `lib/grading.ts`.

- [ ] **Step 1: Write failing grading test**

`frontend/src/lib/grading.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { norm, quizIsRight, fillIsRight } from './grading'

describe('grading', () => {
  it('norm trims, lowercases, collapses spaces', () => {
    expect(norm('  Put   Off ')).toBe('put off')
  })
  it('quizIsRight compares keys', () => {
    expect(quizIsRight('B', 'B')).toBe(true)
    expect(quizIsRight('A', 'B')).toBe(false)
  })
  it('fillIsRight is case/space-insensitive', () => {
    expect(fillIsRight(' Resilient ', 'resilient')).toBe(true)
    expect(fillIsRight('wrong', 'resilient')).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm run test -- grading`
Expected: FAIL — cannot resolve `./grading`.

- [ ] **Step 3: Implement grading**

`frontend/src/lib/grading.ts`:
```ts
export const norm = (v: string): string => (v || '').trim().toLowerCase().replace(/\s+/g, ' ')
export const quizIsRight = (pick: string | null, correct: string): boolean => pick === correct
export const fillIsRight = (value: string, answer: string): boolean => norm(value) === norm(answer)
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- grading`
Expected: PASS (3 tests).

- [ ] **Step 5: Implement seed data (verbatim content from export)**

`frontend/src/data/seed.ts`:
```ts
export interface SessionItem {
  word: string; phon: string; meaning: string; example: string
  quiz: { correct: string; options: [string, string][] }
  fill: { before: string; after: string; answer: string; hint: string }
}

export const SESSION: SessionItem[] = [
  { word:'resilient', phon:'/rɪˈzɪl.i.ənt/ · adjective', meaning:'có khả năng phục hồi nhanh; kiên cường', example:'She is so resilient — she bounced back within a week.',
    quiz:{ correct:'B', options:[['A','dễ vỡ, mong manh'],['B','có khả năng phục hồi nhanh'],['C','cứng nhắc, không linh hoạt'],['D','hào phóng, rộng lượng']] },
    fill:{ before:'The economy proved remarkably', after:', recovering faster than anyone expected.', answer:'resilient', hint:'r________' } },
  { word:'serendipity', phon:'/ˌser.ənˈdɪp.ə.ti/ · noun', meaning:'sự tình cờ may mắn; duyên may bất ngờ', example:'Finding that little café was pure serendipity.',
    quiz:{ correct:'C', options:[['A','sự xui xẻo'],['B','sự cẩn thận'],['C','sự tình cờ may mắn'],['D','sự tức giận']] },
    fill:{ before:'Finding that little café was pure', after:'.', answer:'serendipity', hint:'s__________' } },
  { word:'meticulous', phon:'/məˈtɪk.jə.ləs/ · adjective', meaning:'tỉ mỉ, kỹ lưỡng, cẩn thận', example:'He kept meticulous records of every transaction.',
    quiz:{ correct:'A', options:[['A','tỉ mỉ, cẩn thận'],['B','cẩu thả'],['C','hào phóng'],['D','vội vàng']] },
    fill:{ before:'He kept', after:'records of every transaction.', answer:'meticulous', hint:'m_________' } },
  { word:'ambiguous', phon:'/æmˈbɪɡ.ju.əs/ · adjective', meaning:'mơ hồ, nước đôi, đa nghĩa', example:'The instructions were ambiguous and confusing.',
    quiz:{ correct:'D', options:[['A','rõ ràng'],['B','chính xác'],['C','ngắn gọn'],['D','mơ hồ, đa nghĩa']] },
    fill:{ before:'The instructions were', after:'and confusing.', answer:'ambiguous', hint:'a________' } },
  { word:'to put off', phon:'phrasal verb', meaning:'trì hoãn, hoãn lại', example:"Don't put off until tomorrow what you can do today.",
    quiz:{ correct:'B', options:[['A','hoàn thành'],['B','trì hoãn'],['C','bắt đầu'],['D','tăng tốc']] },
    fill:{ before:"Don't", after:'until tomorrow what you can do today.', answer:'put off', hint:'p__ o__' } },
]

export interface DeckVM { name: string; tag: string; meta: string; mastery: string; last: string; barW: string; needAttention: boolean }
export const seedDecks: DeckVM[] = [
  { name:'Business English', tag:'chủ đề', meta:'92 thẻ · 12 đến hạn', mastery:'thành thạo 72%', last:'2 ngày trước', barW:'72%', needAttention:false },
  { name:'Idioms & Phrasal', tag:'chủ đề', meta:'58 thẻ · 7 đến hạn', mastery:'thành thạo 44%', last:'hôm qua', barW:'44%', needAttention:false },
  { name:'Lỗi của tôi', tag:'cần chú ý', meta:'23 thẻ · 9 đến hạn', mastery:'thành thạo 28%', last:'hôm nay', barW:'28%', needAttention:true },
  { name:'Grammar Notes', tag:'ngữ pháp', meta:'41 thẻ · 3 đến hạn', mastery:'thành thạo 61%', last:'4 ngày trước', barW:'61%', needAttention:false },
  { name:'Phim & Podcast', tag:'ghi chú', meta:'67 thẻ · 0 đến hạn', mastery:'thành thạo 85%', last:'1 tuần trước', barW:'85%', needAttention:false },
]

export const weeklyBars: { label: string; h: number }[] =
  [['T2',55],['T3',80],['T4',40],['T5',95],['T6',65],['T7',28],['CN',18]].map(([label,h]) => ({ label: label as string, h: h as number }))

export const mastery = [{ label:'Mới', n:96 }, { label:'Đang học', n:177 }, { label:'Thành thạo', n:213 }]
export const needsReview = [{ word:'much vs many', detail:'sai 4×' }, { word:'to put off', detail:'sai 3×' }, { word:'since / for', detail:'sai 3×' }]

export const wordOfDay = { word:'serendipity', phon:'/ˌser.ənˈdɪp.ə.ti/ · noun', meaning:'sự tình cờ may mắn; duyên may bất ngờ', example:'“Finding that café was pure serendipity.”' }

export const recentlyAdded = [
  { type:'Từ vựng', title:'resilient', sub:'/rɪˈzɪl.i.ənt/ (adj) có khả năng phục hồi nhanh; kiên cường', when:'hôm nay' },
  { type:'Idiom', title:'to beat around the bush', sub:'nói vòng vo, không vào thẳng vấn đề', when:'hôm qua' },
  { type:'Lỗi', title:'“much” vs “many”', sub:'hay nhầm với danh từ đếm được / không đếm được', when:'2 ngày' },
]

// 126 cells (7 days x 18 weeks); intensity level 0..3 — deterministic, ported from export.
export function makeHeatmap(): number[] {
  const out: number[] = []
  for (let i = 0; i < 126; i++) {
    const v = (i * 53 + 17) % 7
    out.push(v === 0 ? 0 : v < 2 ? 1 : v < 4 ? 2 : 3)
  }
  return out
}

export const sampleJson = [
  '{', '  "deck": "Business English",', '  "topic": "chủ đề",', '  "cards": [', '    {',
  '      "word": "resilient",', '      "phonetic": "/rɪˈzɪl.i.ənt/",', '      "pos": "adjective",',
  '      "meaning": "có khả năng phục hồi nhanh",', '      "example": "She is so resilient."',
  '    }', '  ]', '}',
].join('\n')
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/data/seed.ts frontend/src/lib/grading.ts frontend/src/lib/grading.test.ts
git commit -m "feat: seed data and grading helpers"
```

---

## Task 6: Zustand store with persistence

**Files:**
- Create: `frontend/src/store/useAppStore.ts`
- Test: `frontend/src/store/useAppStore.test.ts`

**Interfaces:**
- Consumes: types (Task 3), `applyTheme` (Task 2), `Deck` (Task 3).
- Produces: `useAppStore` (Zustand hook + vanilla `getState/setState`), `initialState`. Actions per `AppActions`. Persists only the whitelisted subset under key `snoopify_v1`.

- [ ] **Step 1: Write the failing test**

`frontend/src/store/useAppStore.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore, initialState } from './useAppStore'

const reset = () => useAppStore.setState({ ...initialState })

describe('useAppStore', () => {
  beforeEach(() => { localStorage.clear(); reset() })

  it('advanceSession increments index and correct count', () => {
    useAppStore.getState().advanceSession(true)
    expect(useAppStore.getState().sIndex).toBe(1)
    expect(useAppStore.getState().sCorrect).toBe(1)
    useAppStore.getState().advanceSession(false)
    expect(useAppStore.getState().sIndex).toBe(2)
    expect(useAppStore.getState().sCorrect).toBe(1)
  })

  it('advanceSession resets per-card flags', () => {
    useAppStore.setState({ flipped: true, quizPick: 'A', fillValue: 'x', fillChecked: true })
    useAppStore.getState().advanceSession(true)
    const s = useAppStore.getState()
    expect([s.flipped, s.quizPick, s.fillValue, s.fillChecked]).toEqual([false, null, '', false])
  })

  it('setReviewMode clears per-card state', () => {
    useAppStore.setState({ flipped: true, quizPick: 'A' })
    useAppStore.getState().setReviewMode('quiz')
    expect(useAppStore.getState().reviewMode).toBe('quiz')
    expect(useAppStore.getState().flipped).toBe(false)
    expect(useAppStore.getState().quizPick).toBe(null)
  })

  it('resetProgress clears session and imported decks', () => {
    useAppStore.setState({ sIndex: 3, sCorrect: 2, importedDecks: [{ name:'X', topic:'', count:0, cards:[] }], confirmReset: true })
    useAppStore.getState().resetProgress()
    const s = useAppStore.getState()
    expect(s.sIndex).toBe(0); expect(s.sCorrect).toBe(0)
    expect(s.importedDecks).toEqual([]); expect(s.confirmReset).toBe(false)
  })

  it('parseAndImport adds a valid deck', () => {
    useAppStore.getState().parseAndImport(JSON.stringify({ deck:'D', topic:'t', cards:[{ word:'a', meaning:'b' }] }))
    const s = useAppStore.getState()
    expect(s.importedDecks).toHaveLength(1)
    expect(s.importedDecks[0]).toMatchObject({ name:'D', count:1 })
    expect(s.importStatus?.ok).toBe(true)
    expect(s.importText).toBe('')
  })

  it('parseAndImport rejects invalid JSON', () => {
    useAppStore.getState().parseAndImport('{ not json')
    expect(useAppStore.getState().importStatus?.ok).toBe(false)
    expect(useAppStore.getState().importedDecks).toHaveLength(0)
  })

  it('parseAndImport rejects missing required fields', () => {
    useAppStore.getState().parseAndImport(JSON.stringify({ deck:'D', cards:[{ meaning:'no word' }] }))
    expect(useAppStore.getState().importStatus?.ok).toBe(false)
  })

  it('persists only whitelisted keys to snoopify_v1', () => {
    useAppStore.getState().setPanel('settingsOpen', true)
    useAppStore.getState().toggleDark()
    const raw = JSON.parse(localStorage.getItem('snoopify_v1')!)
    const persisted = raw.state ?? raw
    expect(persisted.dark).toBe(true)
    expect('settingsOpen' in persisted).toBe(false)
    expect('importStatus' in persisted).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm run test -- useAppStore`
Expected: FAIL — cannot resolve `./useAppStore`.

- [ ] **Step 3: Implement the store**

`frontend/src/store/useAppStore.ts`:
```ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppStore, AppState, Deck } from './types'
import { applyTheme } from '../theme/tokens'

export const initialState: AppState = {
  reviewMode: 'flash', flipped: false, quizPick: null, fillValue: '', fillChecked: false,
  sIndex: 0, sCorrect: 0, dark: false, lang: 'vn', collapsed: false,
  settingsOpen: false, confirmReset: false, importOpen: false, notifOpen: false, langMenuOpen: false,
  importText: '', importStatus: null, importedDecks: [],
}

const PERSIST_KEYS: (keyof AppState)[] = [
  'reviewMode','flipped','quizPick','sIndex','sCorrect','fillValue','fillChecked',
  'importedDecks','dark','lang','collapsed',
]

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      setReviewMode: (mode) => set({ reviewMode: mode, flipped: false, quizPick: null, fillValue: '', fillChecked: false }),
      flip: () => set((s) => ({ flipped: !s.flipped })),
      pickQuiz: (key) => set((s) => (s.quizPick == null ? { quizPick: key } : {})),
      setFill: (value) => set({ fillValue: value }),
      checkFill: () => set({ fillChecked: true }),
      advanceSession: (correct) => set((s) => ({
        sCorrect: s.sCorrect + (correct ? 1 : 0), sIndex: s.sIndex + 1,
        flipped: false, quizPick: null, fillValue: '', fillChecked: false,
      })),
      resetSession: () => set({ sIndex: 0, sCorrect: 0, flipped: false, quizPick: null, fillValue: '', fillChecked: false }),
      toggleDark: () => { const dark = !get().dark; set({ dark }); applyTheme(dark) },
      setLang: (lang) => set({ lang, langMenuOpen: false }),
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
      setPanel: (panel, open) => set({ [panel]: open } as Partial<AppState>),
      setImportText: (text) => set({ importText: text }),
      parseAndImport: (text) => {
        try {
          const data = JSON.parse(text)
          const name = data.deck || data.name
          const cards = data.cards
          if (!name || !Array.isArray(cards) || cards.length === 0) throw new Error('format')
          const clean = cards.filter((c: any) => c && c.word).map((c: any) => ({
            word: String(c.word), phonetic: c.phonetic || '', pos: c.pos || '', meaning: c.meaning || '', example: c.example || '',
          }))
          if (clean.length === 0) throw new Error('empty')
          const deck: Deck = { name: String(name), topic: data.topic || '', count: clean.length, cards: clean }
          set((s) => ({ importedDecks: [...s.importedDecks, deck], importStatus: { ok: true, msg: 'Đã nhập “' + name + '” · ' + clean.length + ' thẻ' }, importText: '' }))
        } catch {
          set({ importStatus: { ok: false, msg: 'JSON không hợp lệ hoặc thiếu trường bắt buộc (deck, cards[].word).' } })
        }
      },
      resetProgress: () => set({ sIndex: 0, sCorrect: 0, flipped: false, quizPick: null, fillValue: '', fillChecked: false, importedDecks: [], confirmReset: false, settingsOpen: false }),
    }),
    {
      name: 'snoopify_v1',
      partialize: (s) => Object.fromEntries(PERSIST_KEYS.map((k) => [k, s[k]])) as Partial<AppState>,
      onRehydrateStorage: () => (state) => { if (state) applyTheme(state.dark) },
    },
  ),
)
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- useAppStore`
Expected: PASS (8 tests). Also run `npm run test -- useT` now → PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/store/useAppStore.ts frontend/src/store/useAppStore.test.ts
git commit -m "feat: Zustand store with persistence and import logic"
```

---

## Task 7: Error boundary

**Files:**
- Create: `frontend/src/ErrorBoundary.tsx`
- Test: `frontend/src/ErrorBoundary.test.tsx`

**Interfaces:**
- Produces: `ErrorBoundary` component rendering children, or a fallback message on render error.

- [ ] **Step 1: Write the failing test**

`frontend/src/ErrorBoundary.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

function Boom(): JSX.Element { throw new Error('boom') }

describe('ErrorBoundary', () => {
  it('renders fallback on child error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<ErrorBoundary><Boom /></ErrorBoundary>)
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  })
  it('renders children when no error', () => {
    render(<ErrorBoundary><span>ok</span></ErrorBoundary>)
    expect(screen.getByText('ok')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm run test -- ErrorBoundary`
Expected: FAIL — cannot resolve `./ErrorBoundary`.

- [ ] **Step 3: Implement**

`frontend/src/ErrorBoundary.tsx`:
```tsx
import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }
  static getDerivedStateFromError(): State { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return <div className="flex min-h-screen items-center justify-center p-8 text-muted">Something went wrong. Please reload the page.</div>
    }
    return this.props.children
  }
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- ErrorBoundary`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/ErrorBoundary.tsx frontend/src/ErrorBoundary.test.tsx
git commit -m "feat: top-level error boundary"
```

---

## Task 8: UI primitives — static set

**Files:**
- Create: `frontend/src/components/ui/Card.tsx`, `Button.tsx`, `Badge.tsx`, `TagPill.tsx`, `StatTile.tsx`, `ProgressBar.tsx`, `ProgressRing.tsx`, `Icon.tsx`, `Avatar.tsx`
- Test: `frontend/src/components/ui/primitives.test.tsx`

**Interfaces:**
- Produces presentational components (props only, no store access):
  - `Card({ as?, className?, children })` — surface container: `rounded-2xl bg-surface border border-line`.
  - `Button({ variant='primary'|'ghost'|'danger', size?, disabled?, onClick, children, className? })`.
  - `Badge({ tone?, children })` and `TagPill({ tone?: 'muted'|'rust', children })` — small uppercase label.
  - `StatTile({ value, label, serif? })` — big number + caption; serif uses `font-serif`.
  - `ProgressBar({ value, tone?: 'accent'|'rust', className? })` — 0..100 width fill.
  - `ProgressRing({ value, max, size?, label? })` — SVG circle, accent stroke (`var(--accent)`), track `var(--track)`.
  - `Icon({ name, size? })` — inline SVG by name (minimal set: search, bell, sun, moon, chevron, check, x, plus). Unknown name → empty `<svg>`.
  - `Avatar({ name, streak? })` — initial circle + optional streak text.

- [ ] **Step 1: Write the failing tests**

`frontend/src/components/ui/primitives.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Card } from './Card'
import { Button } from './Button'
import { TagPill } from './TagPill'
import { StatTile } from './StatTile'
import { ProgressBar } from './ProgressBar'
import { ProgressRing } from './ProgressRing'

describe('primitives', () => {
  it('Card renders children', () => {
    render(<Card>hi</Card>); expect(screen.getByText('hi')).toBeInTheDocument()
  })
  it('Button fires onClick and respects disabled', async () => {
    let n = 0
    const { rerender } = render(<Button onClick={() => n++}>go</Button>)
    await userEvent.click(screen.getByText('go')); expect(n).toBe(1)
    rerender(<Button onClick={() => n++} disabled>go</Button>)
    await userEvent.click(screen.getByText('go')); expect(n).toBe(1)
  })
  it('TagPill renders text', () => { render(<TagPill>chủ đề</TagPill>); expect(screen.getByText('chủ đề')).toBeInTheDocument() })
  it('StatTile shows value and label', () => {
    render(<StatTile value="486" label="thẻ đã học" />)
    expect(screen.getByText('486')).toBeInTheDocument()
    expect(screen.getByText('thẻ đã học')).toBeInTheDocument()
  })
  it('ProgressBar clamps width style', () => {
    const { container } = render(<ProgressBar value={68} />)
    const fill = container.querySelector('[data-fill]') as HTMLElement
    expect(fill.style.width).toBe('68%')
  })
  it('ProgressRing renders an svg with label', () => {
    render(<ProgressRing value={8} max={24} label="8/24" />)
    expect(screen.getByText('8/24')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm run test -- primitives`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement primitives**

`frontend/src/components/ui/Card.tsx`:
```tsx
import type { ElementType, ReactNode } from 'react'
export function Card({ as: As = 'div' as ElementType, className = '', children }: { as?: ElementType; className?: string; children: ReactNode }) {
  return <As className={`rounded-2xl bg-surface border border-line ${className}`}>{children}</As>
}
```

`frontend/src/components/ui/Button.tsx`:
```tsx
import type { ReactNode } from 'react'
type Variant = 'primary' | 'ghost' | 'danger'
const styles: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:opacity-90',
  ghost: 'bg-surface text-ink border border-line hover:bg-paper',
  danger: 'bg-rust text-white hover:opacity-90',
}
export function Button({ variant = 'primary', disabled, onClick, children, className = '' }:
  { variant?: Variant; disabled?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return <button disabled={disabled} onClick={onClick}
    className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}>{children}</button>
}
```

`frontend/src/components/ui/Badge.tsx`:
```tsx
import type { ReactNode } from 'react'
export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-semibold ${className}`}>{children}</span>
}
```

`frontend/src/components/ui/TagPill.tsx`:
```tsx
import type { ReactNode } from 'react'
export function TagPill({ tone = 'muted', children }: { tone?: 'muted' | 'rust'; children: ReactNode }) {
  const cls = tone === 'rust' ? 'text-rust bg-[#f6e6e2]' : 'text-muted bg-paper'
  return <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls}`}>{children}</span>
}
```

`frontend/src/components/ui/StatTile.tsx`:
```tsx
export function StatTile({ value, label, serif = true }: { value: string; label: string; serif?: boolean }) {
  return (
    <div>
      <div className={`text-3xl ${serif ? 'font-serif' : 'font-sans'} text-ink`}>{value}</div>
      <div className="mt-1 text-sm text-muted">{label}</div>
    </div>
  )
}
```

`frontend/src/components/ui/ProgressBar.tsx`:
```tsx
export function ProgressBar({ value, tone = 'accent', className = '' }: { value: number; tone?: 'accent' | 'rust'; className?: string }) {
  const w = Math.max(0, Math.min(100, value))
  const bg = tone === 'rust' ? 'var(--rust)' : 'var(--accent)'
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-track ${className}`}>
      <div data-fill className="h-full rounded-full" style={{ width: `${w}%`, background: bg }} />
    </div>
  )
}
```

`frontend/src/components/ui/ProgressRing.tsx`:
```tsx
export function ProgressRing({ value, max, size = 120, label }: { value: number; max: number; size?: number; label?: string }) {
  const r = (size - 22) / 2
  const c = 2 * Math.PI * r
  const pct = max > 0 ? Math.min(1, value / max) : 0
  return (
    <div className="relative inline-grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--track)" strokeWidth={22} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--accent)" strokeWidth={22}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size/2} ${size/2})`} />
      </svg>
      {label && <span className="absolute font-serif text-lg text-ink">{label}</span>}
    </div>
  )
}
```

`frontend/src/components/ui/Icon.tsx`:
```tsx
const PATHS: Record<string, string> = {
  search: 'M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Zm10 2-4.35-4.35',
  bell: 'M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10ZM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4',
  moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z',
  chevron: 'm6 9 6 6 6-6',
  check: 'M20 6 9 17l-5-5',
  x: 'M18 6 6 18M6 6l12 12',
  plus: 'M12 5v14M5 12h14',
}
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const d = PATHS[name]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {d && <path d={d} />}
    </svg>
  )
}
```

`frontend/src/components/ui/Avatar.tsx`:
```tsx
export function Avatar({ name, streak }: { name: string; streak?: number }) {
  const initial = name.trim().charAt(0).toUpperCase()
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-9 w-9 place-items-center rounded-full bg-accent text-sm font-semibold text-white">{initial}</div>
      <div className="leading-tight">
        <div className="text-sm font-semibold text-ink">{name}</div>
        {streak != null && <div className="text-xs text-muted">streak {streak} ngày</div>}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- primitives`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui
git commit -m "feat: static UI primitives"
```

---

## Task 9: UI primitives — interactive set

**Files:**
- Create: `frontend/src/components/ui/Modal.tsx`, `Toggle.tsx`, `SearchInput.tsx`, `Heatmap.tsx`, `BarChart.tsx`
- Test: `frontend/src/components/ui/interactive.test.tsx`

**Interfaces:**
- Produces:
  - `Modal({ open, onClose, title?, children })` — fixed overlay; backdrop click + close button call `onClose`; renders nothing when `!open`.
  - `Toggle({ checked, onChange, label? })` — accessible switch (`role="switch"`).
  - `SearchInput({ value, onChange, placeholder })` — text input with search icon.
  - `Heatmap({ levels })` — `number[]` 0..3 → grid of cells colored by accent mix.
  - `BarChart({ bars })` — `{label,h}[]` → vertical bars; first 5 filled accent, last 2 dashed outline.

- [ ] **Step 1: Write the failing tests**

`frontend/src/components/ui/interactive.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from './Modal'
import { Toggle } from './Toggle'
import { SearchInput } from './SearchInput'
import { Heatmap } from './Heatmap'
import { BarChart } from './BarChart'

describe('interactive primitives', () => {
  it('Modal hidden when closed, visible when open', () => {
    const { rerender } = render(<Modal open={false} onClose={() => {}}>body</Modal>)
    expect(screen.queryByText('body')).not.toBeInTheDocument()
    rerender(<Modal open onClose={() => {}}>body</Modal>)
    expect(screen.getByText('body')).toBeInTheDocument()
  })
  it('Modal close button calls onClose', async () => {
    const onClose = vi.fn()
    render(<Modal open onClose={onClose} title="T">body</Modal>)
    await userEvent.click(screen.getByLabelText('close'))
    expect(onClose).toHaveBeenCalled()
  })
  it('Toggle calls onChange with next value', async () => {
    const onChange = vi.fn()
    render(<Toggle checked={false} onChange={onChange} />)
    await userEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })
  it('SearchInput emits typed value', async () => {
    const onChange = vi.fn()
    render(<SearchInput value="" onChange={onChange} placeholder="tìm" />)
    await userEvent.type(screen.getByPlaceholderText('tìm'), 'a')
    expect(onChange).toHaveBeenCalledWith('a')
  })
  it('Heatmap renders one cell per level', () => {
    const { container } = render(<Heatmap levels={[0,1,2,3]} />)
    expect(container.querySelectorAll('[data-cell]').length).toBe(4)
  })
  it('BarChart renders a bar per item with label', () => {
    render(<BarChart bars={[{label:'T2',h:55},{label:'T3',h:80}]} />)
    expect(screen.getByText('T2')).toBeInTheDocument()
    expect(screen.getByText('T3')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run to verify fail**

Run: `npm run test -- interactive`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement**

`frontend/src/components/ui/Modal.tsx`:
```tsx
import type { ReactNode } from 'react'
import { Icon } from './Icon'
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-surface p-5 border border-line" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base font-semibold text-ink">{title}</div>
          <button aria-label="close" onClick={onClose} className="text-muted hover:text-ink"><Icon name="x" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
```

`frontend/src/components/ui/Toggle.tsx`:
```tsx
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 rounded-full transition ${checked ? 'bg-accent' : 'bg-track'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}
```

`frontend/src/components/ui/SearchInput.tsx`:
```tsx
import { Icon } from './Icon'
export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm">
      <span className="text-muted"><Icon name="search" size={16} /></span>
      <input className="w-full bg-transparent outline-none text-ink placeholder:text-muted"
        value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
```

`frontend/src/components/ui/Heatmap.tsx`:
```tsx
function color(lv: number): string {
  if (lv === 0) return 'var(--track)'
  if (lv === 1) return 'color-mix(in srgb, var(--accent) 30%, #fff)'
  if (lv === 2) return 'color-mix(in srgb, var(--accent) 65%, #fff)'
  return 'var(--accent)'
}
export function Heatmap({ levels }: { levels: number[] }) {
  return (
    <div className="grid grid-flow-col grid-rows-7 gap-1">
      {levels.map((lv, i) => <div key={i} data-cell className="h-3 w-3 rounded-sm" style={{ background: color(lv) }} />)}
    </div>
  )
}
```

`frontend/src/components/ui/BarChart.tsx`:
```tsx
export function BarChart({ bars }: { bars: { label: string; h: number }[] }) {
  return (
    <div className="flex items-end gap-3" style={{ height: 140 }}>
      {bars.map((b, i) => (
        <div key={b.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end">
            <div className="w-full rounded-t-md" style={{
              height: `${b.h}%`,
              background: i < 5 ? 'var(--accent)' : 'transparent',
              border: i < 5 ? 'none' : '1.5px dashed var(--line)',
            }} />
          </div>
          <span className="text-xs text-muted">{b.label}</span>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npm run test -- interactive`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ui
git commit -m "feat: interactive UI primitives (modal, toggle, search, heatmap, barchart)"
```

---

## Task 10: Routing shell + layout chrome

**Files:**
- Create: `frontend/src/routes.tsx`, `frontend/src/components/layout/Sidebar.tsx`, `Topbar.tsx`, `NotificationsMenu.tsx`, `LangMenu.tsx`, `SettingsPanel.tsx`
- Modify: `frontend/src/App.tsx`, `frontend/src/main.tsx`
- Test: `frontend/src/components/layout/layout.test.tsx`

**Interfaces:**
- Consumes: store (Task 6), `useT` (Task 4), primitives (Tasks 8–9).
- Produces: `App` rendering `<BrowserRouter>`-less shell (BrowserRouter moves to main.tsx), `Sidebar` (brand "Snoopify" + NavLinks to `/ /library /review /add /progress` + decks + user/settings trigger), `Topbar` (greeting, search, bell→NotificationsMenu, lang→LangMenu), `SettingsPanel` (dark Toggle, language, reset-progress with confirm). Placeholder screens are added in later tasks; here routes point to stubs.

- [ ] **Step 1: main.tsx wraps app in BrowserRouter + ErrorBoundary**

`frontend/src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ErrorBoundary } from './ErrorBoundary'
import './index.css'
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary><BrowserRouter><App /></BrowserRouter></ErrorBoundary>
  </React.StrictMode>,
)
```

- [ ] **Step 2: routes.tsx with temporary stubs**

`frontend/src/routes.tsx`:
```tsx
import { Routes, Route } from 'react-router-dom'
function Stub({ name }: { name: string }) { return <div className="p-8 text-ink">{name}</div> }
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Stub name="Dashboard" />} />
      <Route path="/library" element={<Stub name="Library" />} />
      <Route path="/review" element={<Stub name="Review" />} />
      <Route path="/add" element={<Stub name="Add" />} />
      <Route path="/progress" element={<Stub name="Progress" />} />
    </Routes>
  )
}
```
(Each stub is replaced by the real screen in Tasks 11–15.)

- [ ] **Step 3: Sidebar (brand = Snoopify)**

`frontend/src/components/layout/Sidebar.tsx`:
```tsx
import { NavLink } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import { Avatar } from '../ui/Avatar'
import { Icon } from '../ui/Icon'

const links = (t: ReturnType<typeof useT>) => [
  { to: '/', label: t.home }, { to: '/library', label: t.library },
  { to: '/review', label: t.review }, { to: '/add', label: t.add }, { to: '/progress', label: t.progress },
]
export function Sidebar() {
  const t = useT()
  const setPanel = useAppStore((s) => s.setPanel)
  return (
    <aside className="flex w-60 flex-col gap-4 border-r border-line bg-surface p-4">
      <div className="flex items-center gap-2 px-2 text-lg font-semibold text-ink">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-white">S</span> Snoopify
      </div>
      <nav className="flex flex-col gap-1">
        {links(t).map((l) => (
          <NavLink key={l.to} to={l.to} end={l.to === '/'}
            className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 ${isActive ? 'bg-accent-soft text-accent font-semibold' : 'text-ink'}`}>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex items-center justify-between">
        <Avatar name="Minh" streak={12} />
        <button aria-label={t.settings} onClick={() => setPanel('settingsOpen', true)} className="text-muted hover:text-ink"><Icon name="chevron" /></button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 4: Topbar, NotificationsMenu, LangMenu**

`frontend/src/components/layout/NotificationsMenu.tsx`:
```tsx
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
export function NotificationsMenu() {
  const open = useAppStore((s) => s.notifOpen)
  const setPanel = useAppStore((s) => s.setPanel)
  const t = useT()
  if (!open) return null
  const items = [[t.n1, t.n1t], [t.n2, t.n2t], [t.n3, t.n3t]]
  return (
    <div className="absolute right-0 top-12 z-40 w-72 rounded-xl border border-line bg-surface p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">{t.notif}</span>
        <button className="text-xs text-accent" onClick={() => setPanel('notifOpen', false)}>{t.markRead}</button>
      </div>
      {items.map(([msg, when], i) => (
        <div key={i} className="border-t border-line py-2 first:border-t-0">
          <div className="text-sm text-ink">{msg}</div>
          <div className="text-xs text-muted">{when}</div>
        </div>
      ))}
    </div>
  )
}
```

`frontend/src/components/layout/LangMenu.tsx`:
```tsx
import { useAppStore } from '../../store/useAppStore'
export function LangMenu() {
  const open = useAppStore((s) => s.langMenuOpen)
  const lang = useAppStore((s) => s.lang)
  const setLang = useAppStore((s) => s.setLang)
  if (!open) return null
  return (
    <div className="absolute right-0 top-12 z-40 w-40 rounded-xl border border-line bg-surface p-1 shadow-lg">
      <button onClick={() => setLang('vn')} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${lang !== 'en' ? 'bg-accent-soft text-accent font-semibold' : 'text-ink'}`}>🇻🇳 Tiếng Việt</button>
      <button onClick={() => setLang('en')} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${lang === 'en' ? 'bg-accent-soft text-accent font-semibold' : 'text-ink'}`}>🇬🇧 English</button>
    </div>
  )
}
```

`frontend/src/components/layout/Topbar.tsx`:
```tsx
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import { SearchInput } from '../ui/SearchInput'
import { Icon } from '../ui/Icon'
import { NotificationsMenu } from './NotificationsMenu'
import { LangMenu } from './LangMenu'
import { useState } from 'react'
export function Topbar() {
  const t = useT()
  const setPanel = useAppStore((s) => s.setPanel)
  const flag = useAppStore((s) => (s.lang === 'en' ? '🇬🇧' : '🇻🇳'))
  const [q, setQ] = useState('')
  return (
    <header className="flex items-center gap-4 border-b border-line bg-paper px-6 py-3">
      <div className="text-lg font-semibold text-ink">{t.greeting}</div>
      <div className="ml-auto w-72"><SearchInput value={q} onChange={setQ} placeholder={t.searchPh} /></div>
      <div className="relative">
        <button aria-label={t.notif} onClick={() => setPanel('notifOpen', true)} className="text-muted hover:text-ink"><Icon name="bell" /></button>
        <NotificationsMenu />
      </div>
      <div className="relative">
        <button aria-label={t.language} onClick={() => setPanel('langMenuOpen', true)} className="text-base">{flag}</button>
        <LangMenu />
      </div>
    </header>
  )
}
```

- [ ] **Step 5: SettingsPanel with reset confirm**

`frontend/src/components/layout/SettingsPanel.tsx`:
```tsx
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import { Modal } from '../ui/Modal'
import { Toggle } from '../ui/Toggle'
import { Button } from '../ui/Button'
export function SettingsPanel() {
  const t = useT()
  const { settingsOpen, dark, confirmReset } = useAppStore((s) => ({ settingsOpen: s.settingsOpen, dark: s.dark, confirmReset: s.confirmReset }))
  const { setPanel, toggleDark, resetProgress } = useAppStore.getState()
  return (
    <Modal open={settingsOpen} onClose={() => setPanel('settingsOpen', false)} title={t.settings}>
      <div className="flex items-center justify-between py-2">
        <span className="text-sm text-ink">{t.darkMode}</span>
        <Toggle checked={dark} onChange={() => toggleDark()} label={t.darkMode} />
      </div>
      <div className="border-t border-line pt-3">
        {!confirmReset ? (
          <Button variant="ghost" onClick={() => setPanel('confirmReset', true)}>{t.resetProgress}</Button>
        ) : (
          <div className="space-y-2">
            <div className="text-sm text-ink">{t.resetConfirm}</div>
            <div className="flex gap-2">
              <Button variant="danger" onClick={() => resetProgress()}>{t.deleteAll}</Button>
              <Button variant="ghost" onClick={() => setPanel('confirmReset', false)}>{t.cancel}</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
```

- [ ] **Step 6: App shell composes chrome + routes**

`frontend/src/App.tsx`:
```tsx
import { Sidebar } from './components/layout/Sidebar'
import { Topbar } from './components/layout/Topbar'
import { SettingsPanel } from './components/layout/SettingsPanel'
import { AppRoutes } from './routes'
export default function App() {
  return (
    <div className="flex min-h-screen bg-paper text-ink">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar />
        <main className="flex-1 overflow-auto p-6"><AppRoutes /></main>
      </div>
      <SettingsPanel />
    </div>
  )
}
```

- [ ] **Step 7: Write the failing test**

`frontend/src/components/layout/layout.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../../App'
import { useAppStore, initialState } from '../../store/useAppStore'

const renderApp = (path = '/') => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)

describe('layout', () => {
  beforeEach(() => { localStorage.clear(); useAppStore.setState({ ...initialState }) })
  it('shows Snoopify brand', () => { renderApp(); expect(screen.getByText('Snoopify')).toBeInTheDocument() })
  it('settings trigger opens panel with dark toggle', async () => {
    renderApp()
    await userEvent.click(screen.getByLabelText('Cài đặt'))
    expect(screen.getByText('Chế độ tối')).toBeInTheDocument()
  })
  it('reset requires confirm step', async () => {
    useAppStore.setState({ settingsOpen: true })
    renderApp()
    await userEvent.click(screen.getByText('Đặt lại tiến độ'))
    expect(screen.getByText('Xoá hết')).toBeInTheDocument()
  })
})
```

- [ ] **Step 8: Run tests**

Run: `npm run test -- layout`
Expected: PASS (3 tests).

- [ ] **Step 9: Commit**

```bash
git add frontend/src/App.tsx frontend/src/main.tsx frontend/src/routes.tsx frontend/src/components/layout
git commit -m "feat: routing shell, sidebar/topbar/settings chrome"
```

---

## Task 11: Dashboard screen

**Files:**
- Create: `frontend/src/features/dashboard/DashboardScreen.tsx` and sub-sections `TodaySession.tsx`, `Streak.tsx`, `QuickAdd.tsx`, `RecentlyAdded.tsx`, `WordOfDay.tsx`, `WeekProgress.tsx`
- Modify: `frontend/src/routes.tsx` (replace Dashboard stub)
- Test: `frontend/src/features/dashboard/dashboard.test.tsx`

**Interfaces:**
- Consumes: `useT`, store, primitives (`Card`, `ProgressRing`, `ProgressBar`, `Button`, `TagPill`), seed (`recentlyAdded`, `wordOfDay`, `weeklyBars`).
- Produces: `DashboardScreen` default export composed of the six sections. "Bắt đầu ôn tập" button navigates to `/review`.

- [ ] **Step 1: Build the sections**

Port layout from the export's dashboard region. Each section is a `Card`. Key content (from seed + dictionary):
- `TodaySession`: `ProgressRing value={8} max={24} label="8/24"`, text "Còn 16 thẻ đến hạn" / "18 từ vựng · 4 ngữ pháp · 2 cụm từ", `Button` (`t.startReview`) → `useNavigate()('/review')`, "≈ 8 phút".
- `Streak`: "Chuỗi học ◆ 12 ngày liên tục" + day chips `T2 T3 T4 T5 T6 T7 CN`.
- `QuickAdd`: input "Thêm nhanh một từ, cụm từ hay câu mẫu…" + type chips (Từ vựng/Cụm từ/Ngữ pháp/Lỗi) + "Lưu" button (no-op submit for parity; clears local input).
- `RecentlyAdded`: map `recentlyAdded` → rows (`TagPill` type, title, sub, when) + "Xem tất cả →".
- `WordOfDay`: render `wordOfDay` (word, phon, meaning, example) + "Nghe" button; hidden when store/seed `showWordOfDay` is false (default true).
- `WeekProgress`: `ProgressBar value={68}`, "Tiến độ tuần 68%", "Còn 2 ngày để đạt mục tiêu · 5 buổi/tuần", "281 thẻ · 5 bộ", stats "486 thẻ đã học · 213 đã thành thạo".

Example `frontend/src/features/dashboard/TodaySession.tsx`:
```tsx
import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { ProgressRing } from '../../components/ui/ProgressRing'
import { Button } from '../../components/ui/Button'
import { useT } from '../../i18n/useT'
export function TodaySession() {
  const t = useT(); const nav = useNavigate()
  return (
    <Card className="flex items-center gap-6 p-6">
      <ProgressRing value={8} max={24} label="8/24" />
      <div className="flex-1">
        <div className="text-xs uppercase tracking-wide text-muted">{t.todaySession}</div>
        <div className="mt-1 text-ink">Còn 16 thẻ đến hạn</div>
        <div className="text-sm text-muted">18 từ vựng · 4 ngữ pháp · 2 cụm từ</div>
        <div className="mt-3 flex items-center gap-3">
          <Button onClick={() => nav('/review')}>{t.startReview}</Button>
          <span className="text-sm text-muted">≈ 8 phút</span>
        </div>
      </div>
    </Card>
  )
}
```
(Build the other five sections analogously, porting text/layout from the export. Keep each file focused.)

- [ ] **Step 2: Compose DashboardScreen**

`frontend/src/features/dashboard/DashboardScreen.tsx`:
```tsx
import { TodaySession } from './TodaySession'
import { Streak } from './Streak'
import { QuickAdd } from './QuickAdd'
import { RecentlyAdded } from './RecentlyAdded'
import { WordOfDay } from './WordOfDay'
import { WeekProgress } from './WeekProgress'
export default function DashboardScreen() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <TodaySession /><QuickAdd /><RecentlyAdded />
      </div>
      <div className="space-y-5">
        <Streak /><WordOfDay /><WeekProgress />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Wire route**

In `frontend/src/routes.tsx`, replace the Dashboard stub:
```tsx
import DashboardScreen from './features/dashboard/DashboardScreen'
// ...
<Route path="/" element={<DashboardScreen />} />
```

- [ ] **Step 4: Write the test**

`frontend/src/features/dashboard/dashboard.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import DashboardScreen from './DashboardScreen'
import { useAppStore, initialState } from '../../store/useAppStore'

function Harness() {
  return (
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<DashboardScreen />} />
        <Route path="/review" element={<div>REVIEW PAGE</div>} />
      </Routes>
    </MemoryRouter>
  )
}
describe('DashboardScreen', () => {
  beforeEach(() => { localStorage.clear(); useAppStore.setState({ ...initialState }) })
  it('renders today session and word of day', () => {
    render(<Harness />)
    expect(screen.getByText('8/24')).toBeInTheDocument()
    expect(screen.getByText('serendipity')).toBeInTheDocument()
  })
  it('start review navigates to /review', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByText('Bắt đầu ôn tập'))
    expect(screen.getByText('REVIEW PAGE')).toBeInTheDocument()
  })
})
```

- [ ] **Step 5: Run tests + manual check**

Run: `npm run test -- dashboard`
Expected: PASS (2 tests). Then `npm run dev` and confirm the dashboard matches the export.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/dashboard frontend/src/routes.tsx
git commit -m "feat: dashboard screen"
```

---

## Task 12: Library screen + JSON import modal

**Files:**
- Create: `frontend/src/features/library/LibraryScreen.tsx`, `DeckCard.tsx`, `DeckList.tsx`, `GroupBySelector.tsx`, `ImportJsonModal.tsx`
- Modify: `frontend/src/routes.tsx`
- Test: `frontend/src/features/library/library.test.tsx`

**Interfaces:**
- Consumes: store (`importedDecks`, `importOpen`, `importText`, `importStatus`, `setImportText`, `parseAndImport`, `setPanel`), seed (`seedDecks`, `sampleJson`), primitives.
- Produces: `LibraryScreen` default export. Shows `seedDecks` + imported decks. "Nhập từ JSON" opens `ImportJsonModal`. GroupBy is local UI state (topic/date/mastery) affecting ordering only.

- [ ] **Step 1: DeckCard + DeckList**

`frontend/src/features/library/DeckCard.tsx`:
```tsx
import { Card } from '../../components/ui/Card'
import { TagPill } from '../../components/ui/TagPill'
import { ProgressBar } from '../../components/ui/ProgressBar'
export interface DeckCardProps { name: string; tag: string; meta: string; mastery: string; last: string; barW: string; needAttention?: boolean }
export function DeckCard({ name, tag, meta, mastery, last, barW, needAttention }: DeckCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-ink">{name}</div>
        <TagPill tone={needAttention ? 'rust' : 'muted'}>{tag}</TagPill>
      </div>
      <div className="mt-1 text-sm text-muted">{meta}</div>
      <div className="mt-3"><ProgressBar value={parseInt(barW)} tone={needAttention ? 'rust' : 'accent'} /></div>
      <div className="mt-2 flex justify-between text-xs text-muted"><span>{mastery}</span><span>{last}</span></div>
    </Card>
  )
}
```

`frontend/src/features/library/DeckList.tsx`:
```tsx
import { DeckCard, type DeckCardProps } from './DeckCard'
export function DeckList({ decks }: { decks: DeckCardProps[] }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{decks.map((d, i) => <DeckCard key={d.name + i} {...d} />)}</div>
}
```

- [ ] **Step 2: ImportJsonModal**

`frontend/src/features/library/ImportJsonModal.tsx`:
```tsx
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import { Modal } from '../../components/ui/Modal'
import { Button } from '../../components/ui/Button'
import { sampleJson } from '../../data/seed'
export function ImportJsonModal() {
  const t = useT()
  const { importOpen, importText, importStatus } = useAppStore((s) => ({ importOpen: s.importOpen, importText: s.importText, importStatus: s.importStatus }))
  const { setPanel, setImportText, parseAndImport } = useAppStore.getState()
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader()
    r.onload = () => setImportText(String(r.result || ''))
    r.onerror = () => parseAndImport('')
    r.readAsText(f)
  }
  return (
    <Modal open={importOpen} onClose={() => setPanel('importOpen', false)} title={t.importJson}>
      <p className="mb-2 text-sm text-muted">Chọn file .json theo cấu trúc mẫu bên dưới, hoặc dán trực tiếp rồi bấm Nhập.</p>
      <input type="file" accept=".json" onChange={onFile} className="mb-2 text-sm" />
      <textarea aria-label="json" value={importText} onChange={(e) => setImportText(e.target.value)}
        className="h-32 w-full rounded-lg border border-line bg-paper p-2 font-mono text-xs text-ink" placeholder="Chọn file .json hoặc dán bên dưới" />
      <pre className="mt-2 max-h-32 overflow-auto rounded-lg bg-paper p-2 text-xs text-muted">{sampleJson}</pre>
      <div className="mt-3 flex items-center gap-3">
        <Button onClick={() => parseAndImport(importText)}>{t.importJson}</Button>
        {importStatus && <span className={`text-sm ${importStatus.ok ? 'text-accent' : 'text-rust'}`}>{importStatus.msg}</span>}
      </div>
    </Modal>
  )
}
```

- [ ] **Step 3: GroupBySelector + LibraryScreen**

`frontend/src/features/library/GroupBySelector.tsx`:
```tsx
export type GroupBy = 'topic' | 'date' | 'mastery'
export function GroupBySelector({ value, onChange }: { value: GroupBy; onChange: (g: GroupBy) => void }) {
  const opts: [GroupBy, string][] = [['topic', 'Chủ đề'], ['date', 'Ngày học'], ['mastery', 'Độ thành thạo']]
  return (
    <div className="flex gap-2">
      {opts.map(([k, label]) => (
        <button key={k} onClick={() => onChange(k)}
          className={`rounded-lg px-3 py-1.5 text-sm ${value === k ? 'bg-accent-soft text-accent font-semibold' : 'text-muted'}`}>{label}</button>
      ))}
    </div>
  )
}
```

`frontend/src/features/library/LibraryScreen.tsx`:
```tsx
import { useMemo, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import { Button } from '../../components/ui/Button'
import { DeckList } from './DeckList'
import { GroupBySelector, type GroupBy } from './GroupBySelector'
import { ImportJsonModal } from './ImportJsonModal'
import { seedDecks } from '../../data/seed'
import type { DeckCardProps } from './DeckCard'
export default function LibraryScreen() {
  const t = useT()
  const imported = useAppStore((s) => s.importedDecks)
  const setPanel = useAppStore((s) => s.setPanel)
  const [group, setGroup] = useState<GroupBy>('topic')
  const decks: DeckCardProps[] = useMemo(() => {
    const importedVM = imported.map((d) => ({ name: d.name, tag: d.topic || 'đã nhập', meta: `${d.count} thẻ · chưa ôn`, mastery: 'mới · chưa ôn', last: 'vừa nhập', barW: '0%', needAttention: false }))
    const all = [...seedDecks, ...importedVM]
    if (group === 'mastery') return [...all].sort((a, b) => parseInt(b.barW) - parseInt(a.barW))
    return all
  }, [imported, group])
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">{t.libraryTitle}</h1>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setPanel('importOpen', true)}>{t.importJson}</Button>
          <Button>{t.newDeck}</Button>
        </div>
      </div>
      <GroupBySelector value={group} onChange={setGroup} />
      <DeckList decks={decks} />
      <ImportJsonModal />
    </div>
  )
}
```

- [ ] **Step 4: Wire route**

In `frontend/src/routes.tsx`:
```tsx
import LibraryScreen from './features/library/LibraryScreen'
// <Route path="/library" element={<LibraryScreen />} />
```

- [ ] **Step 5: Write the test**

`frontend/src/features/library/library.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LibraryScreen from './LibraryScreen'
import { useAppStore, initialState } from '../../store/useAppStore'

const renderLib = () => render(<MemoryRouter><LibraryScreen /></MemoryRouter>)
describe('LibraryScreen', () => {
  beforeEach(() => { localStorage.clear(); useAppStore.setState({ ...initialState }) })
  it('lists seed decks', () => { renderLib(); expect(screen.getByText('Business English')).toBeInTheDocument() })
  it('import: invalid JSON shows error', async () => {
    useAppStore.setState({ importOpen: true })
    renderLib()
    await userEvent.type(screen.getByLabelText('json'), '{ bad')
    await userEvent.click(screen.getByText('Nhập từ JSON'))
    expect(screen.getByText(/JSON không hợp lệ/)).toBeInTheDocument()
  })
  it('import: valid JSON adds a deck', async () => {
    useAppStore.setState({ importOpen: true, importText: JSON.stringify({ deck: 'My Deck', cards: [{ word: 'x' }] }) })
    renderLib()
    await userEvent.click(screen.getByText('Nhập từ JSON'))
    expect(screen.getByText('My Deck')).toBeInTheDocument()
  })
})
```

- [ ] **Step 6: Run tests + manual check**

Run: `npm run test -- library`
Expected: PASS (3 tests). Then `npm run dev` to compare against export.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/features/library frontend/src/routes.tsx
git commit -m "feat: library screen and JSON import"
```

---

## Task 13: Review screen + modes

**Files:**
- Create: `frontend/src/features/review/ReviewScreen.tsx`, `ModeSwitcher.tsx`, `FlashcardMode.tsx`, `QuizMode.tsx`, `FillMode.tsx`, `SpacedRepetitionRating.tsx`, `SessionComplete.tsx`
- Modify: `frontend/src/routes.tsx`
- Test: `frontend/src/features/review/review.test.tsx`

**Interfaces:**
- Consumes: store (`reviewMode, flipped, quizPick, fillValue, fillChecked, sIndex, sCorrect` + actions `setReviewMode, flip, pickQuiz, setFill, checkFill, advanceSession, resetSession`), `SESSION` (seed), grading helpers, primitives, `useNavigate`.
- Produces: `ReviewScreen` default export. Reads `cur = SESSION[sIndex]`; when `sIndex >= SESSION.length` renders `SessionComplete`.

- [ ] **Step 1: ModeSwitcher**

`frontend/src/features/review/ModeSwitcher.tsx`:
```tsx
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import type { ReviewMode } from '../../store/types'
export function ModeSwitcher() {
  const t = useT()
  const mode = useAppStore((s) => s.reviewMode)
  const setReviewMode = useAppStore((s) => s.setReviewMode)
  const defs: [ReviewMode, string][] = [['flash', t.flashcard], ['quiz', t.quiz], ['fill', t.fill]]
  return (
    <div className="flex gap-2">
      {defs.map(([k, label]) => (
        <button key={k} onClick={() => setReviewMode(k)}
          className={`rounded-xl border px-4 py-2 text-sm ${mode === k ? 'border-accent bg-accent-soft text-accent font-semibold' : 'border-line bg-surface text-muted'}`}>{label}</button>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: SpacedRepetitionRating (used by flashcard)**

`frontend/src/features/review/SpacedRepetitionRating.tsx`:
```tsx
export function SpacedRepetitionRating({ onRate }: { onRate: (correct: boolean) => void }) {
  const opts: [string, string, boolean][] = [
    ['Quên', 'ôn lại ngay', false],
    ['Mơ hồ', 'sau 1 ngày', true],
    ['Nhớ', 'sau 4 ngày', true],
  ]
  return (
    <div className="grid grid-cols-3 gap-3">
      {opts.map(([label, sub, correct]) => (
        <button key={label} onClick={() => onRate(correct)} className="rounded-xl border border-line bg-surface p-3 text-center hover:bg-paper">
          <div className="font-semibold text-ink">{label}</div>
          <div className="text-xs text-muted">{sub}</div>
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: FlashcardMode, QuizMode, FillMode, SessionComplete**

`frontend/src/features/review/FlashcardMode.tsx`:
```tsx
import { useAppStore } from '../../store/useAppStore'
import { Card } from '../../components/ui/Card'
import { SpacedRepetitionRating } from './SpacedRepetitionRating'
import type { SessionItem } from '../../data/seed'
export function FlashcardMode({ cur }: { cur: SessionItem }) {
  const flipped = useAppStore((s) => s.flipped)
  const flip = useAppStore((s) => s.flip)
  const advance = useAppStore((s) => s.advanceSession)
  return (
    <div className="space-y-4">
      <Card className="cursor-pointer p-10 text-center" >
        <div onClick={() => flip()}>
          {!flipped ? (
            <>
              <div className="text-3xl font-semibold text-ink">{cur.word}</div>
              <div className="mt-1 text-muted">{cur.phon}</div>
              <div className="mt-4 text-sm text-muted">Nhấn để lật thẻ</div>
            </>
          ) : (
            <>
              <div className="text-xs uppercase tracking-wide text-muted">Nghĩa</div>
              <div className="mt-1 text-xl text-ink">{cur.meaning}</div>
              <div className="mt-3 italic text-muted">“{cur.example}”</div>
            </>
          )}
        </div>
      </Card>
      {flipped && <SpacedRepetitionRating onRate={(c) => advance(c)} />}
      <div className="text-center text-xs text-muted">Tự chấm để tính điểm phiên · spaced repetition</div>
    </div>
  )
}
```

`frontend/src/features/review/QuizMode.tsx`:
```tsx
import { useAppStore } from '../../store/useAppStore'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { quizIsRight } from '../../lib/grading'
import type { SessionItem } from '../../data/seed'
export function QuizMode({ cur, isLast }: { cur: SessionItem; isLast: boolean }) {
  const pick = useAppStore((s) => s.quizPick)
  const pickQuiz = useAppStore((s) => s.pickQuiz)
  const advance = useAppStore((s) => s.advanceSession)
  const answered = pick != null
  const right = quizIsRight(pick, cur.quiz.correct)
  const correctLabel = (cur.quiz.options.find((o) => o[0] === cur.quiz.correct) || ['', ''])[1]
  return (
    <Card className="space-y-4 p-6">
      <div className="text-lg font-semibold text-ink">Chọn nghĩa đúng của “{cur.word}”</div>
      <div className="space-y-2">
        {cur.quiz.options.map(([key, label]) => {
          const isCorrect = key === cur.quiz.correct
          const isPicked = pick === key
          let cls = 'border-line'
          if (answered) cls = isCorrect ? 'border-[#3f8f5b] bg-[#eaf3ec] text-[#2f6b43]' : isPicked ? 'border-rust bg-[#f6e6e2] text-rust' : 'opacity-50'
          return (
            <button key={key} disabled={answered} onClick={() => pickQuiz(key)}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-ink ${cls}`}>
              <span className="font-semibold">{key}</span><span>{label}</span>
              {answered && isCorrect && <span className="ml-auto text-[#3f8f5b]">✓</span>}
              {answered && isPicked && !isCorrect && <span className="ml-auto text-rust">✕</span>}
            </button>
          )
        })}
      </div>
      {answered && (
        <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${right ? 'border-[#3f8f5b] bg-[#eaf3ec]' : 'border-rust bg-[#f6e6e2]'}`}>
          <span className={`font-semibold ${right ? 'text-[#2f6b43]' : 'text-rust'}`}>
            {right ? `Chính xác — “${cur.word}”.` : `Chưa đúng. Đáp án: “${correctLabel}”.`}
          </span>
          <Button onClick={() => advance(right)}>{isLast ? 'Xem kết quả →' : 'Tiếp theo →'}</Button>
        </div>
      )}
    </Card>
  )
}
```

`frontend/src/features/review/FillMode.tsx`:
```tsx
import { useAppStore } from '../../store/useAppStore'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { fillIsRight } from '../../lib/grading'
import type { SessionItem } from '../../data/seed'
export function FillMode({ cur, isLast }: { cur: SessionItem; isLast: boolean }) {
  const value = useAppStore((s) => s.fillValue)
  const checked = useAppStore((s) => s.fillChecked)
  const setFill = useAppStore((s) => s.setFill)
  const checkFill = useAppStore((s) => s.checkFill)
  const advance = useAppStore((s) => s.advanceSession)
  const right = fillIsRight(value, cur.fill.answer)
  return (
    <Card className="space-y-4 p-6">
      <div className="text-lg text-ink">
        {cur.fill.before} <span className="font-semibold text-accent">{value || '______'}</span> {cur.fill.after}
      </div>
      <div className="flex gap-2">
        <input aria-label="fill" value={value} onChange={(e) => setFill(e.target.value)} disabled={checked}
          className="flex-1 rounded-xl border border-line bg-paper px-3 py-2 text-ink" />
        <Button disabled={!value} onClick={() => checkFill()}>Kiểm tra</Button>
      </div>
      <div className="text-xs text-muted">Gõ từ còn thiếu · gợi ý: {cur.fill.hint}</div>
      {checked && (
        <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${right ? 'border-[#3f8f5b] bg-[#eaf3ec]' : 'border-rust bg-[#f6e6e2]'}`}>
          <span className={`font-semibold ${right ? 'text-[#2f6b43]' : 'text-rust'}`}>
            {right ? `Chính xác — “${cur.fill.answer}”.` : `Chưa đúng. Đáp án: “${cur.fill.answer}”.`}
          </span>
          <Button onClick={() => advance(right)}>{isLast ? 'Xem kết quả →' : 'Tiếp theo →'}</Button>
        </div>
      )}
    </Card>
  )
}
```

`frontend/src/features/review/SessionComplete.tsx`:
```tsx
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
export function SessionComplete({ correct, total }: { correct: number; total: number }) {
  const nav = useNavigate()
  const resetSession = useAppStore((s) => s.resetSession)
  const accuracy = total ? Math.round((correct / total) * 100) : 0
  return (
    <Card className="space-y-4 p-10 text-center">
      <div className="text-xl font-semibold text-ink">Hoàn thành phiên</div>
      <div className="text-muted">{correct}/{total} câu đúng · {accuracy}% chính xác</div>
      <div className="flex justify-center gap-3">
        <Button onClick={() => resetSession()}>Học lại</Button>
        <Button variant="ghost" onClick={() => { resetSession(); nav('/') }}>Về trang chủ</Button>
      </div>
    </Card>
  )
}
```

- [ ] **Step 4: ReviewScreen orchestrator**

`frontend/src/features/review/ReviewScreen.tsx`:
```tsx
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { ModeSwitcher } from './ModeSwitcher'
import { FlashcardMode } from './FlashcardMode'
import { QuizMode } from './QuizMode'
import { FillMode } from './FillMode'
import { SessionComplete } from './SessionComplete'
import { SESSION } from '../../data/seed'
export default function ReviewScreen() {
  const t = useT(); const nav = useNavigate()
  const { reviewMode, sIndex, sCorrect } = useAppStore((s) => ({ reviewMode: s.reviewMode, sIndex: s.sIndex, sCorrect: s.sCorrect }))
  const total = SESSION.length
  if (sIndex >= total) return <SessionComplete correct={sCorrect} total={total} />
  const cur = SESSION[sIndex]
  const isLast = sIndex >= total - 1
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <ModeSwitcher />
        <button className="text-sm text-muted hover:text-ink" onClick={() => nav('/')}>{t.exit}</button>
      </div>
      <div className="flex items-center gap-3 text-sm text-muted">
        <span>{Math.min(sIndex + 1, total)} / {total}</span>
        <div className="flex-1"><ProgressBar value={Math.round((sIndex / total) * 100)} /></div>
        <span>Business English · {sCorrect} đúng</span>
      </div>
      {reviewMode === 'flash' && <FlashcardMode cur={cur} />}
      {reviewMode === 'quiz' && <QuizMode cur={cur} isLast={isLast} />}
      {reviewMode === 'fill' && <FillMode cur={cur} isLast={isLast} />}
    </div>
  )
}
```

- [ ] **Step 5: Wire route**

In `frontend/src/routes.tsx`:
```tsx
import ReviewScreen from './features/review/ReviewScreen'
// <Route path="/review" element={<ReviewScreen />} />
```

- [ ] **Step 6: Write the test**

`frontend/src/features/review/review.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ReviewScreen from './ReviewScreen'
import { useAppStore, initialState } from '../../store/useAppStore'

const renderReview = () => render(<MemoryRouter><ReviewScreen /></MemoryRouter>)
describe('ReviewScreen', () => {
  beforeEach(() => { localStorage.clear(); useAppStore.setState({ ...initialState }) })

  it('flashcard flips to show meaning', async () => {
    renderReview()
    expect(screen.getByText('resilient')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Nhấn để lật thẻ'))
    expect(screen.getByText('có khả năng phục hồi nhanh; kiên cường')).toBeInTheDocument()
  })

  it('quiz blocks next until a pick, then advances', async () => {
    useAppStore.setState({ reviewMode: 'quiz' })
    renderReview()
    expect(screen.queryByText('Tiếp theo →')).not.toBeInTheDocument()
    await userEvent.click(screen.getByText('có khả năng phục hồi nhanh'))
    expect(screen.getByText(/Chính xác/)).toBeInTheDocument()
  })

  it('fill check is disabled until input has value', async () => {
    useAppStore.setState({ reviewMode: 'fill' })
    renderReview()
    expect(screen.getByText('Kiểm tra')).toBeDisabled()
    await userEvent.type(screen.getByLabelText('fill'), 'resilient')
    expect(screen.getByText('Kiểm tra')).toBeEnabled()
  })

  it('shows session complete when index past end', () => {
    useAppStore.setState({ sIndex: 5, sCorrect: 4 })
    renderReview()
    expect(screen.getByText('Hoàn thành phiên')).toBeInTheDocument()
    expect(screen.getByText(/4\/5 câu đúng/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 7: Run tests + manual check**

Run: `npm run test -- review`
Expected: PASS (4 tests). Then `npm run dev` and walk all three modes to end-of-session.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/features/review frontend/src/routes.tsx
git commit -m "feat: review session with flashcard, quiz, and fill modes"
```

---

## Task 14: Add-knowledge screen

**Files:**
- Create: `frontend/src/features/add/AddScreen.tsx`, `AddCardForm.tsx`, `CardPreview.tsx`
- Modify: `frontend/src/routes.tsx`
- Test: `frontend/src/features/add/add.test.tsx`

**Interfaces:**
- Consumes: `useT`, primitives. Form state is local (`useState`) — faithful parity (the export's add form is presentational; it does not mutate decks). Live preview reflects the typed fields.
- Produces: `AddScreen` default export with a type selector (Từ vựng/Cụm từ/Ngữ pháp/Câu mẫu/Ghi chú/Lỗi), fields (Từ/cụm từ, Phiên âm, Nghĩa, Ví dụ, Bộ thẻ, Tags), `CardPreview`, and "Lưu thẻ"/"Lưu thêm tiếp" buttons.

- [ ] **Step 1: CardPreview**

`frontend/src/features/add/CardPreview.tsx`:
```tsx
import { Card } from '../../components/ui/Card'
export interface PreviewData { word: string; phonetic: string; pos: string; meaning: string; example: string }
export function CardPreview({ data }: { data: PreviewData }) {
  return (
    <Card className="p-5">
      <div className="text-xs uppercase tracking-wide text-muted">Xem trước</div>
      <div className="mt-2 text-2xl font-semibold text-ink">{data.word || 'resilient'}</div>
      <div className="text-muted">{data.phonetic || '/rɪˈzɪl.i.ənt/'} · {data.pos || 'adj'}</div>
      <div className="mt-2 text-ink">{data.meaning || 'có khả năng phục hồi nhanh; kiên cường'}</div>
      <div className="mt-2 italic text-muted">{data.example || 'She is so resilient…'}</div>
    </Card>
  )
}
```

- [ ] **Step 2: AddCardForm + AddScreen**

`frontend/src/features/add/AddCardForm.tsx`:
```tsx
import { useState } from 'react'
import { Button } from '../../components/ui/Button'
import { CardPreview, type PreviewData } from './CardPreview'
const TYPES = ['Từ vựng', 'Cụm từ', 'Ngữ pháp', 'Câu mẫu', 'Ghi chú', 'Lỗi']
const empty: PreviewData = { word: '', phonetic: '', pos: '', meaning: '', example: '' }
export function AddCardForm() {
  const [type, setType] = useState(TYPES[0])
  const [data, setData] = useState<PreviewData>(empty)
  const set = (k: keyof PreviewData) => (e: React.ChangeEvent<HTMLInputElement>) => setData((d) => ({ ...d, [k]: e.target.value }))
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {TYPES.map((tp) => (
            <button key={tp} onClick={() => setType(tp)}
              className={`rounded-lg px-3 py-1.5 text-sm ${type === tp ? 'bg-accent-soft text-accent font-semibold' : 'text-muted'}`}>{tp}</button>
          ))}
        </div>
        <input aria-label="word" placeholder="Từ / cụm từ" value={data.word} onChange={set('word')} className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-ink" />
        <input aria-label="phonetic" placeholder="Phiên âm" value={data.phonetic} onChange={set('phonetic')} className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-ink" />
        <input aria-label="meaning" placeholder="Nghĩa" value={data.meaning} onChange={set('meaning')} className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-ink" />
        <input aria-label="example" placeholder="Ví dụ" value={data.example} onChange={set('example')} className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-ink" />
        <div className="flex gap-2">
          <Button onClick={() => setData(empty)}>Lưu thẻ</Button>
          <Button variant="ghost" onClick={() => setData(empty)}>Lưu thêm tiếp</Button>
        </div>
      </div>
      <CardPreview data={data} />
    </div>
  )
}
```

`frontend/src/features/add/AddScreen.tsx`:
```tsx
import { useT } from '../../i18n/useT'
import { AddCardForm } from './AddCardForm'
export default function AddScreen() {
  const t = useT()
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-ink">{t.addTitle}</h1>
      <AddCardForm />
    </div>
  )
}
```

- [ ] **Step 3: Wire route**

In `frontend/src/routes.tsx`:
```tsx
import AddScreen from './features/add/AddScreen'
// <Route path="/add" element={<AddScreen />} />
```

- [ ] **Step 4: Write the test**

`frontend/src/features/add/add.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AddScreen from './AddScreen'
import { useAppStore, initialState } from '../../store/useAppStore'

describe('AddScreen', () => {
  beforeEach(() => { localStorage.clear(); useAppStore.setState({ ...initialState }) })
  it('typing updates the live preview', async () => {
    render(<MemoryRouter><AddScreen /></MemoryRouter>)
    await userEvent.type(screen.getByLabelText('word'), 'ubiquitous')
    expect(screen.getByText('ubiquitous')).toBeInTheDocument()
  })
})
```

- [ ] **Step 5: Run tests + manual check**

Run: `npm run test -- add`
Expected: PASS (1 test). Then `npm run dev`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/add frontend/src/routes.tsx
git commit -m "feat: add-knowledge screen with live preview"
```

---

## Task 15: Progress screen

**Files:**
- Create: `frontend/src/features/progress/ProgressScreen.tsx`, `Calendar.tsx`, `ReviewBars.tsx`, `MasteryLevels.tsx`, `NeedsReview.tsx`
- Modify: `frontend/src/routes.tsx`
- Test: `frontend/src/features/progress/progress.test.tsx`

**Interfaces:**
- Consumes: `useT`, primitives (`Card`, `StatTile`, `Heatmap`, `BarChart`, `ProgressBar`), seed (`makeHeatmap`, `weeklyBars`, `mastery`, `needsReview`), `useNavigate`.
- Produces: `ProgressScreen` default export. "Ôn ngay nhóm này" navigates to `/review`.

- [ ] **Step 1: Sub-sections**

`frontend/src/features/progress/Calendar.tsx`:
```tsx
import { Card } from '../../components/ui/Card'
import { Heatmap } from '../../components/ui/Heatmap'
import { makeHeatmap } from '../../data/seed'
export function Calendar() {
  return (
    <Card className="p-5">
      <div className="mb-3 text-sm font-semibold text-ink">Lịch học · 18 tuần qua</div>
      <Heatmap levels={makeHeatmap()} />
      <div className="mt-2 flex items-center gap-2 text-xs text-muted">ít <span className="inline-block h-3 w-3 rounded-sm bg-track" /><span className="inline-block h-3 w-3 rounded-sm bg-accent" /> nhiều</div>
    </Card>
  )
}
```

`frontend/src/features/progress/ReviewBars.tsx`:
```tsx
import { Card } from '../../components/ui/Card'
import { BarChart } from '../../components/ui/BarChart'
import { weeklyBars } from '../../data/seed'
export function ReviewBars() {
  return (
    <Card className="p-5">
      <div className="mb-3 text-sm font-semibold text-ink">Lượt ôn mỗi ngày · tuần này</div>
      <BarChart bars={weeklyBars} />
    </Card>
  )
}
```

`frontend/src/features/progress/MasteryLevels.tsx`:
```tsx
import { Card } from '../../components/ui/Card'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { mastery } from '../../data/seed'
export function MasteryLevels() {
  const total = mastery.reduce((s, m) => s + m.n, 0)
  return (
    <Card className="p-5">
      <div className="mb-3 text-sm font-semibold text-ink">Mức độ thành thạo</div>
      <div className="space-y-3">
        {mastery.map((m) => (
          <div key={m.label}>
            <div className="flex justify-between text-sm text-ink"><span>{m.label}</span><span>{m.n}</span></div>
            <ProgressBar value={Math.round((m.n / total) * 100)} />
          </div>
        ))}
      </div>
    </Card>
  )
}
```

`frontend/src/features/progress/NeedsReview.tsx`:
```tsx
import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { needsReview } from '../../data/seed'
export function NeedsReview() {
  const nav = useNavigate()
  return (
    <Card className="p-5">
      <div className="mb-3 text-sm font-semibold text-ink">Cần ôn gấp</div>
      <div className="space-y-2">
        {needsReview.map((n) => (
          <div key={n.word} className="flex justify-between text-sm"><span className="text-ink">{n.word}</span><span className="text-rust">{n.detail}</span></div>
        ))}
      </div>
      <div className="mt-3"><Button onClick={() => nav('/review')}>Ôn ngay nhóm này</Button></div>
    </Card>
  )
}
```

- [ ] **Step 2: ProgressScreen**

`frontend/src/features/progress/ProgressScreen.tsx`:
```tsx
import { useT } from '../../i18n/useT'
import { Card } from '../../components/ui/Card'
import { StatTile } from '../../components/ui/StatTile'
import { Calendar } from './Calendar'
import { ReviewBars } from './ReviewBars'
import { MasteryLevels } from './MasteryLevels'
import { NeedsReview } from './NeedsReview'
export default function ProgressScreen() {
  const t = useT()
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-ink">{t.progressTitle}</h1>
      <Card className="grid grid-cols-2 gap-6 p-6 md:grid-cols-4">
        <StatTile value="12" label="ngày liên tục" />
        <StatTile value="486" label="thẻ đã học" />
        <StatTile value="88%" label="độ chính xác" />
        <StatTile value="1.640" label="lượt ôn tổng" />
      </Card>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Calendar /><ReviewBars /><MasteryLevels /><NeedsReview />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Wire route**

In `frontend/src/routes.tsx`:
```tsx
import ProgressScreen from './features/progress/ProgressScreen'
// <Route path="/progress" element={<ProgressScreen />} />
```

- [ ] **Step 4: Write the test**

`frontend/src/features/progress/progress.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProgressScreen from './ProgressScreen'
import { useAppStore, initialState } from '../../store/useAppStore'

function Harness() {
  return (
    <MemoryRouter initialEntries={['/progress']}>
      <Routes>
        <Route path="/progress" element={<ProgressScreen />} />
        <Route path="/review" element={<div>REVIEW PAGE</div>} />
      </Routes>
    </MemoryRouter>
  )
}
describe('ProgressScreen', () => {
  beforeEach(() => { localStorage.clear(); useAppStore.setState({ ...initialState }) })
  it('renders stat tiles', () => { render(<Harness />); expect(screen.getByText('486')).toBeInTheDocument() })
  it('needs-review CTA navigates to review', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByText('Ôn ngay nhóm này'))
    expect(screen.getByText('REVIEW PAGE')).toBeInTheDocument()
  })
})
```

- [ ] **Step 5: Run tests + manual check**

Run: `npm run test -- progress`
Expected: PASS (2 tests). Then `npm run dev`.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/progress frontend/src/routes.tsx
git commit -m "feat: progress screen with heatmap, charts, mastery"
```

---

## Task 16: Full verification + parity pass

**Files:**
- Modify: any files needing fixes found during verification.

- [ ] **Step 1: Full test suite**

Run in `frontend/`: `npm run test`
Expected: all suites PASS (tokens, useT, grading, useAppStore, ErrorBoundary, primitives, interactive, layout, dashboard, library, review, add, progress).

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit && npm run build`
Expected: no type errors; build succeeds.

- [ ] **Step 3: Manual parity walkthrough**

Run: `npm run dev`. With `myEnglish Dashboard.html` open side-by-side, verify:
- All 5 screens via sidebar nav; active link highlight.
- Dark mode toggle (Settings) flips theme and persists across reload.
- Language switch VN↔EN updates all chrome strings.
- Review: flashcard flip + 3 ratings; quiz correct/incorrect banners; fill check; session-complete; "Học lại" and "Về trang chủ".
- Library: import valid + invalid JSON; imported deck appears.
- Settings reset-progress confirm clears imported decks + session.
- Reload page → persisted state (dark, lang, collapsed, session, imported decks) restored.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: verification pass for Snoopify frontend"
```

---

## Self-Review Notes

- **Spec coverage:** scaffold (T1) · tokens/theme (T2) · types (T3) · i18n (T4) · seed + grading (T5) · store/persistence/import (T6) · error boundary (T7) · ui primitives (T8–T9) · layout/routing/settings (T10) · dashboard (T11) · library + import modal (T12) · review modes (T13) · add (T14) · progress (T15) · verification (T16). All spec sections 4–9 are covered; Section 10 (backend) is a placeholder per T1 Step 7.
- **Persistence whitelist** identical across spec, T6 `PERSIST_KEYS`, and the T6 persistence test.
- **Type names** (`AppState`, `useAppStore`, `SessionItem`, `DeckCardProps`, `parseAndImport`, `advanceSession`, `setReviewMode`, `resetProgress`, `applyTheme`) are consistent between defining and consuming tasks.
- **Brand:** "Snoopify" in `index.html` title (T1) and Sidebar (T10); content/user name unchanged.
