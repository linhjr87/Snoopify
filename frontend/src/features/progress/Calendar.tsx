import { makeHeatmap } from '../../data/seed'

function heatColor(lv: number): string {
  if (lv === 0) return 'var(--track)'
  if (lv === 1) return 'color-mix(in srgb, var(--accent) 30%, #fff)'
  if (lv === 2) return 'color-mix(in srgb, var(--accent) 65%, #fff)'
  return 'var(--accent)'
}

export function Calendar() {
  const levels = makeHeatmap()
  return (
    <div>
      <h2 style={{ margin: '0 0 16px', fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 19 }}>
        Lịch học · 18 tuần qua
      </h2>
      {/* 7-row × 18-col grid, column-major flow */}
      <div style={{
        display: 'grid',
        gridTemplateRows: 'repeat(7, 13px)',
        gridAutoFlow: 'column',
        gridAutoColumns: '13px',
        gap: 4,
      }}>
        {levels.map((lv, i) => (
          <div
            key={i}
            style={{ width: 13, height: 13, borderRadius: 3, background: heatColor(lv) }}
          />
        ))}
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 14, fontSize: 12, color: 'var(--muted)' }}>
        ít
        <div style={{ width: 13, height: 13, borderRadius: 3, background: 'var(--track)' }} />
        <div style={{ width: 13, height: 13, borderRadius: 3, background: 'color-mix(in srgb, var(--accent) 30%, #fff)' }} />
        <div style={{ width: 13, height: 13, borderRadius: 3, background: 'color-mix(in srgb, var(--accent) 65%, #fff)' }} />
        <div style={{ width: 13, height: 13, borderRadius: 3, background: 'var(--accent)' }} />
        nhiều
      </div>
    </div>
  )
}
