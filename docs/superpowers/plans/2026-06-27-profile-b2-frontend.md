# Profile B2 — Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Build the Profile screen (hero, stats, learning goal, achievements) at `/profile`, an entry point to it, and an Edit-profile modal — all wired to the B1 backend (`GET`/`PATCH /profile`).

**Architecture:** A server page fetches `/profile` and renders a client `ProfileScreen` (inline-styled, matching the other feature screens). A `SettingsPanel` entry + sidebar avatar route to `/profile`. An `EditProfileModal` (client) submits `PATCH /profile`. Follows the existing patterns: `apiFetch + orRedirect` (server), `apiPatch` (client), feature-first folders, i18n in both `vn`+`en`.

**Tech Stack:** Next 15 App Router · React 18 · Zustand 4 · Vitest 4 + Testing Library.

## Global Constraints

- Frontend only; commands run from `frontend/` (`npm test`, `npm run lint`). No backend needed for tests — mock `apiFetch`/`apiPatch`/`next/navigation` like the existing feature tests.
- **No path aliases** — relative imports only. **i18n mandatory** — every new key in BOTH `vn` and `en` blocks of `src/i18n/dictionary.ts`; read via `useT()`. `lang` defaults to `vn`.
- Feature screens use **inline `style={{…}}` with CSS vars** (`var(--accent)`, `var(--surface)`, `var(--line)`, `var(--muted)`, `var(--ink)`, `var(--accent-soft)`, `var(--clay)`, `var(--gold)`, `var(--rust)`), matching `ProgressScreen`. Define a local stat-tile rather than importing the Tailwind `ui/StatTile`.
- Server pages fetch with `apiFetch<T>(path).catch(orRedirect(fallback))`; client mutations use `apiPatch` from `src/lib/api.ts` (throws `ApiError(status, detail)`).
- Consumes the B1 contract: `GET /profile` → `ProfileOut`; `PATCH /profile` body `{display_name, username, level, level_target, goal_text, daily_target}` → `ProfileOut`; 409 detail contains "Username"; CEFR codes `A1 A2 B1 B2 C1 C2`; 6 achievement keys in order `streak7, mastered100, sessions10, streak30, mastered500, b2`.
- Branch: `feat/profile-spec-b` (B1 already on it).
- **Account section is intentionally OMITTED** from the Profile screen (the spec flagged it lowest-priority / trimmable; dark/lang/reset/logout already live in `SettingsPanel` + `Topbar`, and duplicating destructive actions in two UIs is a hazard). Profile delivers hero/stats/goal/achievements/edit.

## Shared types + helper (used by all tasks)

Add to `src/lib/api-types.ts`:

```ts
export interface ProfileStats { learned: number; mastered: number; streak: number; accuracy: number }
export interface Achievement { key: string; earned: boolean }
export interface ProfileOut {
  display_name: string
  username: string
  email: string
  created_at: string
  level: string
  level_target: string
  goal_text: string
  daily_target: number
  stats: ProfileStats
  achievements: Achievement[]
}
```

---

### Task 1: Profile screen (display) + page + CEFR helper + i18n

**Files:**
- Modify: `src/lib/api-types.ts` (the types above)
- Create: `src/features/profile/cefr.ts`
- Create: `src/features/profile/ProfileScreen.tsx`
- Create: `src/app/profile/page.tsx`
- Modify: `src/i18n/dictionary.ts` (new keys, both blocks)
- Create: `src/features/profile/profile.test.tsx`

**Interfaces:**
- Consumes: `ProfileOut` (B1). Produces: `ProfileScreen` (default export, prop `profile: ProfileOut`), `CEFR_LEVELS`, `cefrLabel(code, lang)`.

- [ ] **Step 1: Add the types** — paste the `ProfileStats`/`Achievement`/`ProfileOut` block above into `src/lib/api-types.ts`.

- [ ] **Step 2: Add the CEFR helper**

Create `src/features/profile/cefr.ts`:

```ts
import type { Lang } from '../../store/types'

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

const DESCRIPTORS: Record<string, { vn: string; en: string }> = {
  A1: { vn: 'Sơ cấp', en: 'Beginner' },
  A2: { vn: 'Sơ trung cấp', en: 'Elementary' },
  B1: { vn: 'Trung cấp', en: 'Intermediate' },
  B2: { vn: 'Trung cao cấp', en: 'Upper-Intermediate' },
  C1: { vn: 'Cao cấp', en: 'Advanced' },
  C2: { vn: 'Thành thạo', en: 'Proficient' },
}

// "B1" -> "Trung cấp · B1" (vn) / "Intermediate · B1" (en)
export function cefrLabel(code: string, lang: Lang): string {
  const d = DESCRIPTORS[code]
  return d ? `${lang === 'en' ? d.en : d.vn} · ${code}` : code
}
```

- [ ] **Step 3: Add i18n keys**

In `src/i18n/dictionary.ts`, add to the `vn` block:

```ts
    profileTitle:'Hồ sơ', profileSub:'Tài khoản & thành tích', editProfile:'Chỉnh sửa', memberSince:'Thành viên từ',
    pLearned:'thẻ đã học', pMastered:'đã thành thạo', pStreak:'ngày liên tục', pAccuracy:'độ chính xác',
    goalTitle:'Mục tiêu học tập', goalEmpty:'Chưa đặt mục tiêu', goalDailyLabel:'Mục tiêu mỗi ngày', goalCardsPerDay:(n: number) => `${n} thẻ / ngày`, goalLevelLabel:'Trình độ',
    achTitle:'Thành tích', achEarned:(e: number, t: number) => `${e} / ${t} huy hiệu`,
    'streak7':'Chuỗi 7 ngày', 'streak7Desc':'Học 7 ngày liên tục',
    'mastered100':'100 thẻ thành thạo', 'mastered100Desc':'Thành thạo 100 thẻ đầu tiên',
    'sessions10':'Chăm chỉ', 'sessions10Desc':'Ôn tập trong 10 ngày khác nhau',
    'streak30':'Chuỗi 30 ngày', 'streak30Desc':'Học liên tục 30 ngày',
    'mastered500':'500 thẻ thành thạo', 'mastered500Desc':'Thành thạo 500 thẻ',
    'b2':'Bậc thầy B2', 'b2Desc':'Đạt trình độ B2',
    profileMenu:'Hồ sơ',
```

and to the `en` block:

```ts
    profileTitle:'Profile', profileSub:'Account & achievements', editProfile:'Edit', memberSince:'Member since',
    pLearned:'cards learned', pMastered:'mastered', pStreak:'day streak', pAccuracy:'accuracy',
    goalTitle:'Learning goal', goalEmpty:'No goal set yet', goalDailyLabel:'Daily goal', goalCardsPerDay:(n: number) => `${n} cards / day`, goalLevelLabel:'Level',
    achTitle:'Achievements', achEarned:(e: number, t: number) => `${e} / ${t} badges`,
    'streak7':'7-day streak', 'streak7Desc':'Study 7 days in a row',
    'mastered100':'100 cards mastered', 'mastered100Desc':'Master your first 100 cards',
    'sessions10':'Diligent learner', 'sessions10Desc':'Review on 10 different days',
    'streak30':'30-day streak', 'streak30Desc':'Study 30 days in a row',
    'mastered500':'500 cards mastered', 'mastered500Desc':'Master 500 cards',
    'b2':'B2 master', 'b2Desc':'Reach level B2',
    profileMenu:'Profile',
```

- [ ] **Step 4: Write the failing test**

Create `src/features/profile/profile.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProfileScreen from './ProfileScreen'
import { useAppStore, initialState } from '../../store/useAppStore'
import type { ProfileOut } from '../../lib/api-types'

const fixture: ProfileOut = {
  display_name: 'Minh Nguyen', username: 'minh', email: 'minh@example.com',
  created_at: '2024-03-15T00:00:00Z', level: 'B1', level_target: 'B2',
  goal_text: 'Communicate confidently at work', daily_target: 20,
  stats: { learned: 486, mastered: 213, streak: 12, accuracy: 87 },
  achievements: [
    { key: 'streak7', earned: true }, { key: 'mastered100', earned: true },
    { key: 'sessions10', earned: true }, { key: 'streak30', earned: false },
    { key: 'mastered500', earned: false }, { key: 'b2', earned: false },
  ],
}

describe('ProfileScreen', () => {
  beforeEach(() => { localStorage.clear(); useAppStore.setState({ ...initialState }) })

  it('renders identity, stats, goal and achievements', () => {
    render(<ProfileScreen profile={fixture} />)
    expect(screen.getByText('Minh Nguyen')).toBeInTheDocument()
    expect(screen.getByText('minh@example.com')).toBeInTheDocument()
    expect(screen.getByText('486')).toBeInTheDocument()           // learned
    expect(screen.getByText('87%')).toBeInTheDocument()           // accuracy
    expect(screen.getByText('Communicate confidently at work')).toBeInTheDocument()
    expect(screen.getByText('Chuỗi 7 ngày')).toBeInTheDocument()  // earned badge (vn default)
    expect(screen.getByText('Bậc thầy B2')).toBeInTheDocument()   // locked badge
    expect(screen.getByText('3 / 6 huy hiệu')).toBeInTheDocument()
  })

  it('shows a placeholder when no goal is set', () => {
    render(<ProfileScreen profile={{ ...fixture, goal_text: '' }} />)
    expect(screen.getByText('Chưa đặt mục tiêu')).toBeInTheDocument()
  })
})
```

Run (from `frontend/`): `npm test -- src/features/profile/profile.test.tsx` → FAIL (module not found).

- [ ] **Step 5: Build ProfileScreen**

Create `src/features/profile/ProfileScreen.tsx`. It is a client component, inline-styled like `ProgressScreen`. The Edit button accepts an optional `onEdit` callback (wired in Task 3; defaults to a no-op so this task is self-contained):

```tsx
'use client'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import { cefrLabel } from './cefr'
import type { ProfileOut } from '../../lib/api-types'

const ACH_COLORS: Record<string, string> = {
  streak7: 'var(--accent)', mastered100: 'var(--gold)', sessions10: 'var(--clay)',
  streak30: 'var(--rust)', mastered500: '#3a6ea5', b2: 'var(--accent)',
}

export default function ProfileScreen({ profile, onEdit }: { profile: ProfileOut; onEdit?: () => void }) {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const initial = (profile.display_name || profile.username || '?').charAt(0).toUpperCase()
  const earned = profile.achievements.filter((a) => a.earned).length
  const memberSince = new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'vi-VN', { month: 'long', year: 'numeric' }).format(new Date(profile.created_at))

  const stats = [
    { num: String(profile.stats.learned), label: t.pLearned, color: 'var(--ink)' },
    { num: String(profile.stats.mastered), label: t.pMastered, color: 'var(--accent)' },
    { num: String(profile.stats.streak), label: t.pStreak, color: 'var(--clay)' },
    { num: `${profile.stats.accuracy}%`, label: t.pAccuracy, color: 'var(--ink)' },
  ]

  return (
    <div style={{ animation: 'fadeUp .45s ease both' }}>
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>{t.profileSub}</div>
        <h1 style={{ margin: 0, fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: 32 }}>{t.profileTitle}</h1>
      </div>

      {/* Identity hero */}
      <section style={{ border: '1px solid var(--line)', borderRadius: 20, background: 'var(--surface)', padding: 30, display: 'flex', alignItems: 'center', gap: 26, flexWrap: 'wrap', marginBottom: 22 }}>
        <div style={{ width: 88, height: 88, borderRadius: 24, background: 'var(--accent)', color: '#fff', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Newsreader',serif", fontSize: 42, fontWeight: 500 }}>{initial}</div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, flexWrap: 'wrap', marginBottom: 6 }}>
            <h2 style={{ margin: 0, fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: 28 }}>{profile.display_name || profile.username}</h2>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)', background: 'var(--accent-soft)', borderRadius: 999, padding: '4px 12px' }}>{cefrLabel(profile.level, lang)}</span>
          </div>
          <div style={{ fontSize: 15, color: 'var(--muted)' }}>{profile.email}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 5 }}>{t.memberSince} {memberSince}</div>
        </div>
        <button onClick={onEdit} style={{ border: '1px solid var(--line)', borderRadius: 11, background: 'var(--surface)', padding: '11px 20px', fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: 14, color: 'var(--ink)', cursor: 'pointer' }}>{t.editProfile}</button>
      </section>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
        {stats.map((s) => (
          <section key={s.label} style={{ border: '1px solid var(--line)', borderRadius: 16, background: 'var(--surface)', padding: 20 }}>
            <div style={{ fontFamily: "'Newsreader',serif", fontSize: 32, fontWeight: 600, lineHeight: 1, color: s.color }}>{s.num}</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 5 }}>{s.label}</div>
          </section>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Learning goal */}
        <section style={{ flex: '1.4', minWidth: 340, border: '1px solid var(--line)', borderRadius: 18, background: 'var(--surface)', padding: 24 }}>
          <h2 style={{ margin: '0 0 18px', fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: 20 }}>{t.goalTitle}</h2>
          <div style={{ fontSize: 17, fontWeight: 600, color: profile.goal_text ? 'var(--ink)' : 'var(--muted)', paddingBottom: 18, borderBottom: '1px solid var(--line)' }}>
            {profile.goal_text || t.goalEmpty}
          </div>
          <div style={{ display: 'flex', gap: 30, flexWrap: 'wrap', marginTop: 18 }}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>{t.goalDailyLabel}</div>
              <div style={{ fontFamily: "'Newsreader',serif", fontSize: 22, fontWeight: 500 }}>{t.goalCardsPerDay(profile.daily_target)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>{t.goalLevelLabel}</div>
              <div style={{ fontFamily: "'Newsreader',serif", fontSize: 22, fontWeight: 500 }}>{profile.level} → {profile.level_target}</div>
            </div>
          </div>
        </section>

        {/* Achievements */}
        <section style={{ flex: 1, minWidth: 300, border: '1px solid var(--line)', borderRadius: 18, background: 'var(--surface)', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <h2 style={{ margin: 0, fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: 20 }}>{t.achTitle}</h2>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>{t.achEarned(earned, profile.achievements.length)}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
            {profile.achievements.map((a) => {
              const title = (t as Record<string, string>)[a.key] ?? a.key
              const desc = (t as Record<string, string>)[`${a.key}Desc`] ?? ''
              return (
                <div key={a.key} style={{ border: '1px solid var(--line)', borderRadius: 14, background: a.earned ? 'var(--surface)' : 'transparent', padding: 15, display: 'flex', gap: 12, alignItems: 'flex-start', opacity: a.earned ? 1 : 0.6 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 11, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', background: a.earned ? ACH_COLORS[a.key] : 'var(--track)', color: a.earned ? '#fff' : 'var(--muted)', fontWeight: 700 }}>
                    {a.earned ? '★' : '🔒'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>{desc}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Add the server page**

Create `src/app/profile/page.tsx`:

```tsx
import { apiFetch, orRedirect } from '../../lib/api-server'
import type { ProfileOut } from '../../lib/api-types'
import ProfileScreen from '../../features/profile/ProfileScreen'

export default async function ProfilePage() {
  const profile = await apiFetch<ProfileOut>('/profile').catch(orRedirect(null))
  if (!profile) return null
  return <ProfileScreen profile={profile} />
}
```

- [ ] **Step 7: Run tests** — `npm test -- src/features/profile/profile.test.tsx` → PASS; then `npm test` → full suite green.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/lib/api-types.ts frontend/src/features/profile/ frontend/src/app/profile/page.tsx frontend/src/i18n/dictionary.ts
git commit -m "feat(frontend): Profile screen (hero, stats, goal, achievements)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Profile entry point (SettingsPanel + sidebar avatar → /profile)

**Files:**
- Modify: `src/components/layout/SettingsPanel.tsx` (add a "Profile" button)
- Modify: `src/components/layout/Sidebar.tsx` (avatar click → /profile)
- Modify: `src/components/layout/layout.test.tsx` (entry test)

**Interfaces:** Consumes `t.profileMenu` (Task 1). Produces navigation to `/profile`.

- [ ] **Step 1: Write the failing test**

In `src/components/layout/layout.test.tsx`, add (it already renders `AppShell` and mocks `next/navigation` with a `push` spy — reuse that spy; if the existing mock’s push isn’t module-scoped, hoist it the way `Sidebar.test.tsx` does):

```tsx
  it('opens the user menu and navigates to the profile screen', async () => {
    renderShell()
    await userEvent.click(screen.getByLabelText('Settings'))   // opens SettingsPanel
    await userEvent.click(screen.getByText('Hồ sơ'))           // t.profileMenu (vn default)
    expect(pushMock).toHaveBeenCalledWith('/profile')
  })
```

(Match the file's existing `renderShell`/push-spy setup; the settings button's `aria-label` is `t.settings` = "Cài đặt" in vn — use that label if "Settings" doesn't match.)

Run: `npm test -- src/components/layout/layout.test.tsx` → FAIL.

- [ ] **Step 2: Add the "Profile" button to SettingsPanel**

In `src/components/layout/SettingsPanel.tsx`, add `useRouter` (already imported) and a Profile button as the FIRST item inside the panel, before the Logout block:

```tsx
      <button
        onClick={() => { setPanel('settingsOpen', false); router.push('/profile') }}
        style={{ display: 'flex', alignItems: 'center', gap: 7, width: '100%', border: 'none', background: 'transparent', color: 'var(--ink)', cursor: 'pointer', fontSize: 14, padding: '7px 8px', borderRadius: 8, textAlign: 'left', fontFamily: "'Hanken Grotesk', sans-serif", borderBottom: '1px solid var(--line)', marginBottom: 4 }}
      >
        <svg width="14" height="14" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="6" r="3" /><path d="M3.5 15a5.5 5.5 0 0 1 11 0" /></svg>
        {t.profileMenu}
      </button>
```

(Place it right after the `{t.settings}` header `<div>`.)

- [ ] **Step 3: Make the sidebar avatar open the profile**

In `src/components/layout/Sidebar.tsx`, the user-footer button currently toggles settings. Keep that, but make the avatar circle navigate to `/profile` on click (stop propagation so it doesn't also toggle settings). Change the avatar `<div>` inside the footer button to:

```tsx
          <div
            onClick={(e) => { e.stopPropagation(); router.push('/profile') }}
            style={{ width: 34, height: 34, borderRadius: '50%', background: '#e7e1d4', flex: 'none', cursor: 'pointer' }}
          />
```

(The surrounding `<button>` keeps toggling the settings popup as before; `router` is already in scope in `Sidebar`.)

- [ ] **Step 4: Run tests** — `npm test -- src/components/layout/layout.test.tsx` → PASS; then `npm test` → green.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/SettingsPanel.tsx frontend/src/components/layout/Sidebar.tsx frontend/src/components/layout/layout.test.tsx
git commit -m "feat(frontend): add Profile entry from settings menu and avatar

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Edit-profile modal + wiring

**Files:**
- Create: `src/features/profile/EditProfileModal.tsx`
- Modify: `src/features/profile/ProfileScreen.tsx` (open the modal)
- Modify: `src/i18n/dictionary.ts` (edit-form keys, both blocks)
- Create: `src/features/profile/edit-profile.test.tsx`

**Interfaces:** Consumes `ProfileOut`, `CEFR_LEVELS`, `apiPatch`. Produces the modal; on success calls `router.refresh()`.

- [ ] **Step 1: Add i18n keys**

In `src/i18n/dictionary.ts` `vn` block:

```ts
    editProfileTitle:'Chỉnh sửa hồ sơ', levelLabel:'Trình độ hiện tại', levelTargetLabel:'Trình độ mục tiêu', goalTextLabel:'Mục tiêu học tập', dailyTargetLabel:'Số thẻ mỗi ngày', saveProfile:'Lưu', profileUsernameTaken:'Tên đăng nhập đã tồn tại', profileSaveError:'Lưu thất bại — thử lại sau',
```

`en` block:

```ts
    editProfileTitle:'Edit profile', levelLabel:'Current level', levelTargetLabel:'Target level', goalTextLabel:'Learning goal', dailyTargetLabel:'Cards per day', saveProfile:'Save', profileUsernameTaken:'Username already taken', profileSaveError:'Save failed — try again later',
```

(`nameL`, `usernameL`, `cancel` already exist and are reused.)

- [ ] **Step 2: Write the failing test**

Create `src/features/profile/edit-profile.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditProfileModal } from './EditProfileModal'
import type { ProfileOut } from '../../lib/api-types'
import * as api from '../../lib/api'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

const profile: ProfileOut = {
  display_name: 'Minh', username: 'minh', email: 'minh@example.com', created_at: '2024-03-15T00:00:00Z',
  level: 'B1', level_target: 'B2', goal_text: 'Work fluently', daily_target: 20,
  stats: { learned: 1, mastered: 0, streak: 0, accuracy: 0 }, achievements: [],
}

describe('EditProfileModal', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('submits a PATCH with the edited fields', async () => {
    const spy = vi.spyOn(api, 'apiPatch').mockResolvedValue(profile)
    render(<EditProfileModal profile={profile} onClose={() => {}} />)
    await userEvent.clear(screen.getByLabelText('display_name'))
    await userEvent.type(screen.getByLabelText('display_name'), 'Minh N')
    await userEvent.click(screen.getByText('Lưu'))
    expect(spy).toHaveBeenCalledWith('/profile', expect.objectContaining({ display_name: 'Minh N', username: 'minh', level: 'B1', daily_target: 20 }))
  })

  it('shows the username-taken message on 409', async () => {
    vi.spyOn(api, 'apiPatch').mockRejectedValue(new api.ApiError(409, 'Username already taken'))
    render(<EditProfileModal profile={profile} onClose={() => {}} />)
    await userEvent.click(screen.getByText('Lưu'))
    expect(await screen.findByText('Tên đăng nhập đã tồn tại')).toBeInTheDocument()
  })
})
```

Run: `npm test -- src/features/profile/edit-profile.test.tsx` → FAIL.

- [ ] **Step 3: Build the modal**

Create `src/features/profile/EditProfileModal.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '../../i18n/useT'
import { apiPatch, ApiError } from '../../lib/api'
import { CEFR_LEVELS } from './cefr'
import type { ProfileOut } from '../../lib/api-types'

const field: React.CSSProperties = { width: '100%', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: 15, color: 'var(--ink)', background: 'var(--paper)', outline: 'none', boxSizing: 'border-box' }
const labelStyle: React.CSSProperties = { fontSize: 13, color: 'var(--muted)', marginBottom: 6 }

export function EditProfileModal({ profile, onClose }: { profile: ProfileOut; onClose: () => void }) {
  const t = useT()
  const router = useRouter()
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [username, setUsername] = useState(profile.username)
  const [level, setLevel] = useState(profile.level)
  const [levelTarget, setLevelTarget] = useState(profile.level_target)
  const [goalText, setGoalText] = useState(profile.goal_text)
  const [dailyTarget, setDailyTarget] = useState(profile.daily_target)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  const save = async () => {
    setError(''); setPending(true)
    try {
      await apiPatch('/profile', { display_name: displayName, username, level, level_target: levelTarget, goal_text: goalText, daily_target: dailyTarget })
      onClose(); router.refresh()
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setError(t.profileUsernameTaken)
      else setError(t.profileSaveError)
    } finally { setPending(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(33,29,27,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 80 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 460, maxWidth: '100%', maxHeight: '86vh', overflow: 'auto', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 18, padding: 26 }}>
        <h2 style={{ margin: '0 0 18px', fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: 22 }}>{t.editProfileTitle}</h2>

        <div style={{ marginBottom: 14 }}><div style={labelStyle}>{t.nameL}</div>
          <input aria-label="display_name" style={field} value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
        <div style={{ marginBottom: 14 }}><div style={labelStyle}>{t.usernameL}</div>
          <input aria-label="username" style={field} value={username} onChange={(e) => setUsername(e.target.value)} /></div>

        <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
          <div style={{ flex: 1 }}><div style={labelStyle}>{t.levelLabel}</div>
            <select aria-label="level" style={field} value={level} onChange={(e) => setLevel(e.target.value)}>{CEFR_LEVELS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          <div style={{ flex: 1 }}><div style={labelStyle}>{t.levelTargetLabel}</div>
            <select aria-label="level_target" style={field} value={levelTarget} onChange={(e) => setLevelTarget(e.target.value)}>{CEFR_LEVELS.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
        </div>

        <div style={{ marginBottom: 14 }}><div style={labelStyle}>{t.goalTextLabel}</div>
          <input aria-label="goal_text" style={field} value={goalText} onChange={(e) => setGoalText(e.target.value)} /></div>
        <div style={{ marginBottom: 14 }}><div style={labelStyle}>{t.dailyTargetLabel}</div>
          <input aria-label="daily_target" type="number" min={1} max={500} style={field} value={dailyTarget} onChange={(e) => setDailyTarget(Number(e.target.value))} /></div>

        {error && <div role="alert" style={{ fontSize: 13, color: 'var(--rust)', marginBottom: 12 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ border: '1px solid var(--line)', borderRadius: 10, background: 'transparent', color: 'var(--ink)', padding: '10px 18px', fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{t.cancel}</button>
          <button onClick={save} disabled={pending} style={{ border: 'none', borderRadius: 10, background: 'var(--accent)', color: '#fff', padding: '10px 22px', fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: 14, cursor: pending ? 'default' : 'pointer', opacity: pending ? 0.7 : 1 }}>{t.saveProfile}</button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Wire the modal into ProfileScreen**

In `src/features/profile/ProfileScreen.tsx`: import `useState` and the modal, add open state, and pass `onEdit`. Add at the top of the component:

```tsx
import { useState } from 'react'
import { EditProfileModal } from './EditProfileModal'
```
```tsx
  const [editing, setEditing] = useState(false)
```

Change the hero Edit button to `onClick={() => setEditing(true)}` (replace the `onClick={onEdit}`), and render the modal before the closing `</div>` of the component:

```tsx
      {editing && <EditProfileModal profile={profile} onClose={() => setEditing(false)} />}
```

(The `onEdit` prop can be removed from the signature since the screen now manages its own modal state.)

- [ ] **Step 5: Run tests** — `npm test -- src/features/profile/edit-profile.test.tsx` and `npm test -- src/features/profile/profile.test.tsx` → PASS; then `npm test` → full suite green.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/features/profile/EditProfileModal.tsx frontend/src/features/profile/ProfileScreen.tsx frontend/src/features/profile/edit-profile.test.tsx frontend/src/i18n/dictionary.ts
git commit -m "feat(frontend): edit-profile modal wired to PATCH /profile

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Final verification

- [ ] From `frontend/`: `npm test` → all pass; `npm run lint` → clean for new files.
- [ ] Manual smoke (full stack via root `npm run dev`): Settings menu → "Profile" → screen shows hero/stats/goal/achievements; Edit → change a field → Save → values update; changing username to a taken one shows the error.

## Self-review (coverage vs spec §6)

- §6 `/profile` page + `ProfileScreen` (hero/stats/goal/achievements) → Task 1. ✓
- §6 CEFR mapping + `ProfileOut` types → Task 1. ✓
- §6 SettingsPanel "Profile" entry + avatar → Task 2. ✓
- §6 `EditProfileModal` + PATCH + 409 handling → Task 3. ✓
- §6 i18n both blocks → Tasks 1 + 3. ✓
- Account section intentionally omitted (documented in Global Constraints; spec §2 marked it trimmable). 
- Type names (`ProfileOut`, achievement keys, `cefrLabel`, `CEFR_LEVELS`) consistent across tasks. ✓
