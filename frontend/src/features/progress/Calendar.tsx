import type { HeatmapOut } from '../../lib/api-types'

function heatColor(lv: number): string {
  if (lv === 0) return 'var(--track)'
  if (lv === 1) return 'color-mix(in srgb, var(--accent) 30%, #fff)'
  if (lv === 2) return 'color-mix(in srgb, var(--accent) 65%, #fff)'
  return 'var(--accent)'
}

export function Calendar({ heatmap }: { heatmap: HeatmapOut | null }) {
  const levels = heatmap?.cells ?? Array.from({ length: 126 }, () => 0)
  return (
    <div>
      <h2 style={{ margin: '0 0 16px', fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 19 }}>
        Lịch học · 18 tuần qua
      </h2>
      <div style={{ display: 'grid', gridTemplateRows: 'repeat(7, 13px)', gridAutoFlow: 'column', gridAutoColumns: '13px', gap: 4 }}>
        {levels.map((lv, i) => (
          <div key={i} style={{ width: 13, height: 13, borderRadius: 3, background: heatColor(lv) }} />
        ))}
      </div>
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
