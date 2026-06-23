import { useProgressSummary } from './queries'

export function ReviewBars() {
  const { data } = useProgressSummary()
  const bars = data?.weekly_bars ?? []
  const max = Math.max(1, ...bars.map((b) => b.count))
  return (
    <div style={{ marginTop: 26 }}>
      <h2 style={{ margin: '0 0 14px', fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 19 }}>
        Lượt ôn mỗi ngày · tuần này
      </h2>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 140 }}>
        {bars.map((b, i) => (
          <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{
              width: '100%',
              height: `${Math.round((b.count / max) * 100)}%`,
              borderRadius: '7px 7px 0 0',
              background: i < 5 ? 'var(--accent)' : 'transparent',
              border: i < 5 ? 'none' : '1.5px dashed var(--line)',
            }} />
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
