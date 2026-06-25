'use client'
import { useT } from '../../i18n/useT'

export type GroupBy = 'topic' | 'date' | 'mastery'
export function GroupBySelector({ value, onChange }: { value: GroupBy; onChange: (g: GroupBy) => void }) {
  const t = useT()
  const opts: [GroupBy, string][] = [['topic', t.topicLabel], ['date', t.groupByDate], ['mastery', t.groupByMastery]]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '22px', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{t.groupByLabel}</span>
      {opts.map(([k, label]) => {
        const active = value === k
        return (
          <span key={k} onClick={() => onChange(k)} style={{
            fontSize: '13px', cursor: 'pointer',
            border: active ? '1px solid var(--accent)' : '1px solid var(--line)',
            color: active ? 'var(--accent)' : 'var(--muted)',
            background: active ? 'var(--accent-soft)' : 'transparent',
            fontWeight: active ? 600 : 400,
            borderRadius: '999px', padding: '5px 14px',
          }}>{label}</span>
        )
      })}
    </div>
  )
}
