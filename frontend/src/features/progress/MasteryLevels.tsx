'use client'
import { useT } from '../../i18n/useT'
import type { ProgressSummary } from '../../lib/api-types'

const COLORS = ['var(--rust)', '#c9a23a', '#3f8f5b'] // new, learning, proficient

export function MasteryLevels({ summary }: { summary: ProgressSummary | null }) {
  const t = useT()
  const m = summary?.mastery ?? { new: 0, learning: 0, proficient: 0 }
  const rows = [
    { label: t.levelNew, n: m.new },
    { label: t.levelLearning, n: m.learning },
    { label: t.levelProficient, n: m.proficient },
  ]
  const total = Math.max(1, m.new + m.learning + m.proficient)
  return (
    <section style={{ border: '1px solid var(--line)', borderRadius: 18, background: 'var(--surface)', padding: 22, boxShadow: '0 1px 2px rgba(40,35,25,0.03)' }}>
      <h2 style={{ margin: '0 0 16px', fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 18 }}>{t.masteryHeading}</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {rows.map((m2, i) => (
          <div key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 5 }}>
              <span style={{ color: 'var(--ink)' }}>{m2.label}</span>
              <span style={{ color: 'var(--muted)' }}>{m2.n}</span>
            </div>
            <div style={{ height: 9, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
              <div style={{ width: `${Math.round((m2.n / total) * 100)}%`, height: '100%', background: COLORS[i], borderRadius: 999 }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
