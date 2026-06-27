'use client'
import { useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import { cefrLabel } from './cefr'
import type { ProfileOut } from '../../lib/api-types'
import { EditProfileModal } from './EditProfileModal'

const ACH_COLORS: Record<string, string> = {
  streak7: 'var(--accent)', mastered100: 'var(--gold)', sessions10: 'var(--clay)',
  streak30: 'var(--rust)', mastered500: '#3a6ea5', b2: 'var(--accent)',
}

export default function ProfileScreen({ profile }: { profile: ProfileOut }) {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const [editing, setEditing] = useState(false)
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
        <button onClick={() => setEditing(true)} style={{ border: '1px solid var(--line)', borderRadius: 11, background: 'var(--surface)', padding: '11px 20px', fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: 14, color: 'var(--ink)', cursor: 'pointer' }}>{t.editProfile}</button>
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
      {editing && <EditProfileModal profile={profile} onClose={() => setEditing(false)} />}
    </div>
  )
}
