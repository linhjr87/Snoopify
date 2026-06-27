# Snoopify — Profile Screen + Backend (Spec B)

**Date:** 2026-06-27
**Status:** Approved (design)
**Depends on:** Spec A (`feat/fe-improvements-spec-a`) — specifically the `User.username`
column and username validation added there. Spec B builds on the same branch.

## 1. Goal

Build the Profile screen from design v3 (`.claude-design/myEnglish Dashboard v3.html`,
the `data-screen-label="Profile"` section) backed by real data: computed learning
stats, user-editable learning goals + CEFR level, auto-computed achievements, and
profile editing (display name, username). This is the deferred Spec B from
`2026-06-27-fe-improvements-design.md` §9.

## 2. Decisions

| Aspect | Decision |
|---|---|
| Goal/level storage | **Add columns to `User`** (Option A): `level`, `level_target`, `goal_text`, `daily_target`. 1:1, one migration. (Rejected: a separate `user_profiles` table — unnecessary for a small fixed field set.) |
| API shape | One composite `GET /profile` (single fetch for the whole screen) + `PATCH /profile` for edits. New `profile` router + service; reuses `srs.mastery()` and the review-date query pattern from `progress.py`. |
| `learned` stat | Count of cards with `repetitions > 0` (i.e. `learning + proficient` buckets). |
| `mastered` stat | Count of `proficient` cards (`interval_days ≥ 21`, per `srs.mastery`). |
| `streak` stat | Current streak (consecutive days up to today with ≥1 review) — same definition as `progress.summary`. |
| `accuracy` stat | `round(100 * correct / total)` over the user's `ReviewLog` rows where `is_correct IS NOT NULL`; `0` when there are no such rows. |
| Achievements: streaks | 7-day and 30-day badges use the **longest-ever** streak (computed from all review dates), so a badge stays earned after the current streak drops. |
| Achievements: sessions | "10 review sessions" = **≥10 distinct calendar days** with at least one review (all-time). |
| Achievements: mastered | 100 / 500 use the `mastered` (proficient) count. |
| Achievements: B2 | "B2 master" earned when the user's current `level` rank ≥ B2. Level is user-set (the badge), so this is self-declared — the only signal available, matching the design's intent. |
| CEFR levels | Fixed set `A1 A2 B1 B2 C1 C2`, ranked 1..6. Backend stores the code, validates membership. Frontend maps code → label (e.g. `B1` → "Intermediate · B1"). |
| Edit scope | One "Edit profile" modal edits: `display_name`, `username`, `level`, `level_target`, `goal_text`, `daily_target`. **Email is read-only.** |
| Account section (profile) | Reuses existing handlers/endpoints (dark mode, language, view progress, guide, reset, logout) — **no new business logic or endpoints**. Lowest-priority part. |
| Profile entry points | A "Profile" item in `SettingsPanel` (popup) and the sidebar user-footer avatar → `router.push('/profile')`. |
| Branch | Continues on `feat/fe-improvements-spec-a` (depends on Spec A's username; user prefers one branch). |

## 3. Suggested task/PR split (one branch)

- **B1 — backend profile:** `User` columns + migration; `profile` schema/service/router; stats, longest-streak, distinct-days, accuracy, achievements; `PATCH` with username uniqueness; tests.
- **B2 — frontend Profile screen:** `/profile` route + `ProfileScreen` (hero, stats, goal, achievements, account section), CEFR mapping, SettingsPanel "Profile" entry, i18n.
- **B3 — Edit profile modal:** `EditProfileModal` + wiring to `PATCH /profile`, error handling, tests.

## 4. Data model

Add to `app/db/models.py::User` (all with defaults so the migration is safe on
existing rows):

```python
    level: Mapped[str] = mapped_column(String, nullable=False, default="B1")
    level_target: Mapped[str] = mapped_column(String, nullable=False, default="B2")
    goal_text: Mapped[str] = mapped_column(String, nullable=False, default="")
    daily_target: Mapped[int] = mapped_column(Integer, nullable=False, default=20)
```

Alembic migration (down_revision = the username migration `c9527628c583`): `add_column`
for each, all `nullable=False` with `server_default` (`'B1'`, `'B2'`, `''`, `'20'`);
optionally drop the server_defaults afterward (kept is harmless).

CEFR constants live in `app/enums.py` (or a small `app/services/profile.py` constant):
`CEFR_LEVELS = ["A1","A2","B1","B2","C1","C2"]`, rank = index + 1.

## 5. Backend API

### `GET /profile` → `ProfileOut`

```python
class ProfileStats(BaseModel):
    learned: int
    mastered: int
    streak: int
    accuracy: int            # 0..100

class Achievement(BaseModel):
    key: str                 # streak7 | mastered100 | sessions10 | streak30 | mastered500 | b2
    earned: bool

class ProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    display_name: str
    username: str
    email: str
    created_at: datetime
    level: str
    level_target: str
    goal_text: str
    daily_target: int
    stats: ProfileStats
    achievements: list[Achievement]   # the 6 keys above, in that order
```

`achievements` always contains all six keys in the fixed order (so the frontend
maps key → title/description/icon-color via a static table + i18n).

### `PATCH /profile` → `ProfileOut`

```python
class ProfileUpdate(BaseModel):
    display_name: str = Field(max_length=120)
    username: str = Field(min_length=3, max_length=30, pattern=r"^[A-Za-z0-9_.]+$")
    level: str
    level_target: str
    goal_text: str = Field(default="", max_length=200)
    daily_target: int = Field(ge=1, le=500)

    @field_validator("username")
    @classmethod
    def _lower(cls, v: str) -> str: return v.lower()

    @field_validator("level", "level_target")
    @classmethod
    def _cefr(cls, v: str) -> str:
        if v not in CEFR_LEVELS: raise ValueError("invalid CEFR level")
        return v
```

The modal submits all fields. Username uniqueness check **excludes the current
user**: `select(User).where(User.username == new, User.id != user.id)` → 409
`"Username already taken"` if found. Updates the user row, commits, returns the
full `ProfileOut`.

### Service (`app/services/profile.py`)

- `get_profile(session, user)` — loads the user, computes stats + achievements, returns `ProfileOut`.
- `update_profile(session, user, data)` — uniqueness check, apply fields, commit, return `get_profile(...)`.
- Computation (one pass over the user's data):
  - Cards query (join Deck) → bucket via `srs.mastery(reps, interval)` → `learned = learning + proficient`, `mastered = proficient`.
  - All-time review **local dates** for the user (reuse/extract the `progress._review_local_dates` join, without the `since` filter) → a sorted set of dates → `distinct_days`, `current_streak` (from today backward), `longest_streak` (longest consecutive run).
  - Accuracy: one aggregate query over `ReviewLog` (user-scoped via Card→Deck join) `WHERE is_correct IS NOT NULL` → `(total, correct)`.
  - Achievements: `streak7 = longest≥7`, `streak30 = longest≥30`, `mastered100 = mastered≥100`, `mastered500 = mastered≥500`, `sessions10 = distinct_days≥10`, `b2 = rank(level) ≥ rank("B2")`.
- Register routers in `app/api/router.py` (static paths only; no params to clash).

## 6. Frontend

- **`app/profile/page.tsx`** (server component) — `apiFetch<ProfileOut>('/profile')` (orRedirect on 401, matching the other authed pages) → `<ProfileScreen profile={...} />`.
- **`features/profile/ProfileScreen.tsx`** (client) — renders per design v3:
  - Hero: avatar initial (from `display_name`), name, level badge, email, "member since" (formatted from `created_at`), **Edit** button (opens the modal).
  - 4 stat tiles (learned / mastered / streak / accuracy%).
  - Learning goal: `goal_text` (placeholder when empty), daily target, `level → level_target`.
  - Achievements grid (6) — static `key → {titleKey, descKey, color}` table; earned vs locked styling from the design.
  - Account section: reuses existing actions (dark `toggleDark`, language `setLang`, view progress `push('/progress')`, guide `useTourStore.startTour`, reset, logout). No new logic.
- **`features/profile/EditProfileModal.tsx`** (client) — form (display_name, username, level select, level_target select, goal_text, daily_target number) → `apiPatch('/profile', {...})`; on success refresh; 409 → username-taken error; CEFR selects from the shared list.
- **`features/profile/cefr.ts`** — `CEFR_LEVELS` + `cefrLabel(code, lang)` (code → "Intermediate · B1" style).
- **`lib/api-types.ts`** — add `ProfileOut`, `ProfileStats`, `Achievement`.
- **`components/layout/SettingsPanel.tsx`** — add a "Profile" button at the top → `router.push('/profile')` (+ close the popup). Also wire the sidebar user-footer avatar click to `/profile` (currently it only toggles settings).
- **i18n** (`dictionary.ts`, both `vn` + `en`): `profileTitle, profileSub, editProfile, memberSince` (a prefix string, e.g. "Member since" / "Thành viên từ"; the screen formats `created_at` to "month year" via `Intl.DateTimeFormat`), `pLearned, pMastered, pStreak, pAccuracy, goalTitle, goalDailyLabel, goalLevelLabel, goalEmpty, achTitle, achEarned`, the 6 `ach*`/`ach*Desc` pairs, `accountTitle`, `profileMenu` (sidebar entry), edit-form labels, `profileUsernameTaken`, `saveProfile`/`cancel`.

## 7. Testing

**Backend** (Postgres required):
- Stats: a user with known cards/reviews → exact `learned`/`mastered`/`accuracy`; accuracy `0` with no logs.
- Streaks: crafted review dates → correct `current` vs `longest`; `distinct_days`.
- Achievements: each threshold boundary (e.g. longest=6 → not earned, =7 → earned); `b2` by level.
- `PATCH`: updates persist; CEFR validation rejects bad codes (422); username taken by another user → 409; resubmitting your own username → 200.
- `GET /profile` 401 without session.

**Frontend** (Vitest):
- `ProfileScreen` renders hero/stats/goal/achievements from a fixture; locked vs earned badges.
- `EditProfileModal` submits a `PATCH` with all fields; 409 shows the username-taken message.
- `SettingsPanel` "Profile" entry → `router.push('/profile')`.

## 8. Risks / notes

- Backend tests need Postgres (same standing constraint as Spec A). If unavailable, code is written + reviewed by reading; runtime-green pending.
- All-time review-date scan is unbounded; fine at this scale. If history grows huge, push streak/sessions computation into SQL.
- The account section overlaps existing Settings/Topbar UI; it reuses the same actions, so behavior stays single-sourced. It is the lowest-priority slice and may be trimmed during implementation if it reads as redundant.
- `b2` achievement is self-declared via the user-set level — acceptable given no assessment exists; revisit if a real placement/level signal is ever added.
