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
