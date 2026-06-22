import { weeklyBars } from '../../data/seed'

export function ReviewBars() {
  return (
    <div style={{ marginTop: 26 }}>
      <h2 style={{ margin: '0 0 14px', fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 19 }}>
        Lượt ôn mỗi ngày · tuần này
      </h2>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 140 }}>
        {weeklyBars.map((b, i) => (
          <div key={b.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, height: '100%', justifyContent: 'flex-end' }}>
            <div style={{
              width: '100%',
              height: `${b.h}%`,
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
