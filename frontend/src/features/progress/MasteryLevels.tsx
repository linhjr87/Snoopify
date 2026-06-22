import { mastery } from '../../data/seed'

const COLORS = ['var(--rust)', '#c9a23a', '#3f8f5b'] // Mới, Đang học, Thành thạo

export function MasteryLevels() {
  return (
    <section style={{
      border: '1px solid var(--line)', borderRadius: 18,
      background: 'var(--surface)', padding: 22,
      boxShadow: '0 1px 2px rgba(40,35,25,0.03)',
    }}>
      <h2 style={{ margin: '0 0 16px', fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 18 }}>
        Mức độ thành thạo
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {mastery.map((m, i) => (
          <div key={m.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 5 }}>
              <span style={{ color: 'var(--ink)' }}>{m.label}</span>
              <span style={{ color: 'var(--muted)' }}>{m.n}</span>
            </div>
            {/* Export values: Mới=20%, Đang học=37%, Thành thạo=44% */}
            <div style={{ height: 9, borderRadius: 999, background: 'var(--track)', overflow: 'hidden' }}>
              <div style={{
                width: i === 0 ? '20%' : i === 1 ? '37%' : '44%',
                height: '100%',
                background: COLORS[i],
                borderRadius: 999,
              }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
