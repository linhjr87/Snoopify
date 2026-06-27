# FE PR3 — Chatbot UI + Library Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add a non-functional ("coming soon") AI chat panel (FAB + slide-in) per design v3, and make the Library "+ New deck" button navigate to the Add screen (matching the design) while auditing the Import-JSON modal for design conformance.

**Architecture:** A new `ChatPanel` client component, toggled by `chatOpen` in `useAppStore`, rendered by `AppShell` (authed shell only). Input is disabled. Library "+ New deck" routes to `/add` instead of `window.prompt`. Branch `feat/fe-improvements-spec-a`.

**Tech Stack:** Next 15 + React 18 + Zustand 4 + Vitest 4.

## Global Constraints

- Frontend commands run from `frontend/` (`npm test`). Every new i18n key MUST be added to BOTH the `vn` and `en` blocks of `frontend/src/i18n/dictionary.ts`.
- Match existing conventions: inline `style={{…}}`, `useAppStore((s)=>s.field)` selectors, `aria-label` hooks, theme CSS vars (`var(--accent)`, `var(--surface)`, `var(--line)`, `var(--muted)`, `var(--ink)`, `var(--accent-soft)`).
- The chatbot is UI-only: the input and send button are **disabled**; there is no send handler and no message state beyond a single static greeting.
- The chat panel renders only in the authed shell, never on `/login` (AppShell early-returns `<>{children}</>` for `/login`).

---

### Task 1: Chatbot UI (FAB + disabled slide-in panel)

**Files:**
- Modify: `frontend/src/store/types.ts` (add `chatOpen`, `toggleChat`)
- Modify: `frontend/src/store/useAppStore.ts` (initial value + action)
- Create: `frontend/src/components/layout/ChatPanel.tsx`
- Modify: `frontend/src/components/AppShell.tsx` (render `<ChatPanel />`)
- Modify: `frontend/src/i18n/dictionary.ts` (chat keys, both blocks)
- Create: `frontend/src/components/layout/ChatPanel.test.tsx`

**Interfaces:**
- Produces: `useAppStore` state `chatOpen: boolean` + action `toggleChat(): void`; `ChatPanel` component (default-styled, self-contained).

- [ ] **Step 1: Add store state + action**

In `frontend/src/store/types.ts`, add to `AppState` (after `notifRead: boolean`):

```ts
  notifRead: boolean
  chatOpen: boolean
  importText: string
```

and to `AppActions` (after `markNotifsRead(): void`):

```ts
  markNotifsRead(): void
  toggleChat(): void
```

In `frontend/src/store/useAppStore.ts`, add the initial value to `initialState` (after `notifRead: false,`):

```ts
  notifRead: false,
  chatOpen: false,
  importText: '',
```

and the action (after `markNotifsRead`):

```ts
      markNotifsRead: () => set({ notifRead: true }),
      toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
```

(Do NOT add `chatOpen` to `PERSIST_KEYS` — it is session-only.)

- [ ] **Step 2: Write the failing test**

Create `frontend/src/components/layout/ChatPanel.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatPanel } from './ChatPanel'
import { useAppStore, initialState } from '../../store/useAppStore'

describe('ChatPanel', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({ ...initialState })
  })

  it('shows the FAB when closed and no panel', () => {
    render(<ChatPanel />)
    expect(screen.getByLabelText('open AI chat')).toBeInTheDocument()
    expect(screen.queryByLabelText('AI assistant')).not.toBeInTheDocument()
  })

  it('opens the panel with a disabled input when the FAB is clicked', async () => {
    render(<ChatPanel />)
    await userEvent.click(screen.getByLabelText('open AI chat'))
    expect(screen.getByLabelText('AI assistant')).toBeInTheDocument()
    expect(screen.getByLabelText('chat message')).toBeDisabled()
    expect(screen.getByLabelText('send')).toBeDisabled()
  })

  it('closes the panel and restores the FAB', async () => {
    useAppStore.setState({ chatOpen: true })
    render(<ChatPanel />)
    await userEvent.click(screen.getByLabelText('close chat'))
    expect(screen.queryByLabelText('AI assistant')).not.toBeInTheDocument()
    expect(screen.getByLabelText('open AI chat')).toBeInTheDocument()
  })
})
```

Run (from `frontend/`): `npm test -- src/components/layout/ChatPanel.test.tsx` → FAIL (module not found).

- [ ] **Step 3: Add i18n keys**

In `frontend/src/i18n/dictionary.ts`, add to the `vn` block:

```ts
    aiTitle:'Trợ lý AI', aiSub:'Gia sư tiếng Anh của bạn', aiPh:'Hỏi bất cứ điều gì về tiếng Anh…', aiGreeting:'Chào bạn! Mình là gia sư AI. Cứ hỏi mình về từ vựng, ngữ pháp hay cách dùng từ nhé — mình luôn sẵn sàng hỗ trợ.', aiComingSoon:'Sắp ra mắt…',
```

and to the `en` block:

```ts
    aiTitle:'AI assistant', aiSub:'Your English tutor', aiPh:'Ask anything about English…', aiGreeting:"Hi! I'm your AI tutor. Ask me about vocabulary, grammar or word usage — I'm always here to help.", aiComingSoon:'Coming soon…',
```

- [ ] **Step 4: Create ChatPanel**

Create `frontend/src/components/layout/ChatPanel.tsx`:

```tsx
'use client'

import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'

export function ChatPanel() {
  const t = useT()
  const chatOpen = useAppStore((s) => s.chatOpen)
  const toggleChat = useAppStore((s) => s.toggleChat)

  if (!chatOpen) {
    return (
      <button
        onClick={toggleChat}
        aria-label="open AI chat"
        className="cta"
        style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 75, width: 56, height: 56, borderRadius: '50%', background: 'var(--accent)', color: '#fff', border: 'none', boxShadow: '0 12px 26px -8px var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11.5a7.5 7.5 0 0 1-10.8 6.7L4 19.5l1.3-4A7.5 7.5 0 1 1 20 11.5z" /><path d="M8.5 11h7M8.5 8.5h4" /></svg>
      </button>
    )
  }

  return (
    <aside
      aria-label="AI assistant"
      style={{ position: 'fixed', top: 0, right: 0, height: '100vh', width: 368, maxWidth: '100vw', background: 'var(--surface)', borderLeft: '1px solid var(--line)', boxShadow: '-18px 0 44px -28px rgba(20,16,10,0.5)', zIndex: 90, display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '18px 18px 15px', borderBottom: '1px solid var(--line)', flex: 'none' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent)', color: '#fff', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2.5l1.5 3.6 3.9.3-3 2.5 1 3.8L10 11.2 6.6 12.7l1-3.8-3-2.5 3.9-.3z" /></svg>
        </div>
        <div style={{ flex: 1, lineHeight: 1.25 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{t.aiTitle}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t.aiSub}</div>
        </div>
        <button onClick={toggleChat} aria-label="close chat" style={{ border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', borderRadius: 8 }}>
          <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ alignSelf: 'flex-start', maxWidth: '85%', padding: '11px 15px', borderRadius: '16px 16px 16px 5px', background: 'var(--accent-soft)', color: 'var(--ink)', fontSize: 14, lineHeight: 1.5 }}>
          {t.aiGreeting}
        </div>
      </div>

      <div style={{ padding: '13px 14px 16px', borderTop: '1px solid var(--line)', flex: 'none' }}>
        <div style={{ display: 'flex', gap: 9, alignItems: 'flex-end' }}>
          <input className="field" disabled aria-label="chat message" placeholder={t.aiComingSoon} style={{ flex: 1, borderRadius: 12, opacity: 0.6, cursor: 'not-allowed' }} />
          <button disabled aria-label="send" style={{ flex: 'none', width: 42, height: 42, borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', opacity: 0.5, cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 2.5L8 10M15.5 2.5l-4.7 13-2.8-5.5L2.5 7.2z" /></svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
```

- [ ] **Step 5: Render ChatPanel in AppShell**

In `frontend/src/components/AppShell.tsx`, import it and render it inside the authed shell, right after `<GuidedTourOverlay />`:

```tsx
import { GuidedTourOverlay } from './layout/GuidedTourOverlay'
import { ChatPanel } from './layout/ChatPanel'
```
```tsx
      <GuidedTourOverlay />
      <ChatPanel />
    </div>
```

(It must be inside the main `return (...)`, NOT in the `if (pathname === '/login') return <>{children}</>` early-return branch.)

- [ ] **Step 6: Run tests to verify they pass**

Run (from `frontend/`): `npm test -- src/components/layout/ChatPanel.test.tsx` → PASS. Then `npm test` → full suite green (the existing `layout.test.tsx` renders `AppShell`; confirm the added FAB doesn't break its queries — if any layout test now matches "open AI chat" unexpectedly, it won't, since those tests assert on specific other labels/text).

- [ ] **Step 7: Commit**

```bash
git add frontend/src/store/types.ts frontend/src/store/useAppStore.ts frontend/src/components/layout/ChatPanel.tsx frontend/src/components/layout/ChatPanel.test.tsx frontend/src/components/AppShell.tsx frontend/src/i18n/dictionary.ts
git commit -m "feat(frontend): add disabled AI chat panel (FAB + slide-in)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Library "+ New deck" navigates to /add (+ Import-JSON audit)

**Files:**
- Modify: `frontend/src/features/library/LibraryScreen.tsx`
- Modify: `frontend/src/features/library/library.test.tsx`
- Read-only audit: `frontend/src/features/library/ImportJsonModal.tsx` vs design

**Interfaces:** none new.

- [ ] **Step 1: Update the failing test**

In `frontend/src/features/library/library.test.tsx` (it already mocks `next/navigation` — reuse its `pushMock`), add/adjust a test that clicking the header "+ New deck" button navigates to `/add` rather than prompting:

```tsx
  it('navigates to /add when "+ New deck" is clicked', async () => {
    render(<LibraryScreen decks={/* the fixture this file already uses */ []} />)
    await userEvent.click(screen.getByText(/new deck/i))
    expect(pushMock).toHaveBeenCalledWith('/add')
  })
```

Match the file's existing render setup and deck fixture. If an existing test asserts the old `window.prompt` behavior, remove/replace it. Run (from `frontend/`): `npm test -- src/features/library/library.test.tsx` → FAIL.

- [ ] **Step 2: Change `onNewDeck` to navigate**

In `frontend/src/features/library/LibraryScreen.tsx`, replace the `onNewDeck` async function with a navigation:

```tsx
  const onNewDeck = () => router.push('/add')
```

Remove the now-unused `apiPost` import (confirm it's not used elsewhere in this file — it is only used by the old `onNewDeck`). Leave `router` (still used) and the `t.newDeckPrompt`/`t.newDeckFailed` dictionary keys in place (other screens/`AddCardForm` still reference them) — just stop using them here.

- [ ] **Step 3: Run tests to verify they pass**

Run (from `frontend/`): `npm test -- src/features/library/library.test.tsx` → PASS. Then `npm test` → full suite green.

- [ ] **Step 4: Audit the Import-JSON modal**

Read `frontend/src/features/library/ImportJsonModal.tsx` and compare it to the design (the import modal markup in `.claude-design/myEnglish Dashboard v3.html`): title, instructions line, sample `<pre>`, "copy sample" button, file picker label, paste textarea, Import CTA, and the inline status message. It already matches closely. Only adjust genuine divergences (wrong label text, missing element, wrong style token). Do NOT change the `/api/decks/import` flow or the status-handling logic. If no divergence is found, make no code change and note that in the report.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/features/library/LibraryScreen.tsx frontend/src/features/library/library.test.tsx
# include ImportJsonModal.tsx only if Step 4 changed it
git commit -m "fix(frontend): Library '+ New deck' routes to /add (matches design)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Final verification

- [ ] Frontend (from `frontend/`): `npm test` → all pass.
- [ ] Manual smoke (full stack via root `npm run dev`): the chat FAB appears bottom-right; clicking it opens the panel with the greeting and a disabled "Coming soon…" input; closing restores the FAB. In Library, "+ New deck" navigates to the Add screen. Import-JSON modal looks like the design.

## Self-review (coverage vs spec §5.5, §5.6)

- §5.5 chatbot UI (disabled) → Task 1 (store, ChatPanel, AppShell, i18n, tests). ✓
- §5.6 library new-deck → /add + import audit → Task 2. ✓
- New i18n keys in both vn + en; `chatOpen` not persisted. ✓
- Type consistency: `chatOpen`/`toggleChat` defined in Task 1 store edits and consumed only by ChatPanel. ✓
