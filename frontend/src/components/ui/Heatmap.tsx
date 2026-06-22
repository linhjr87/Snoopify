function color(lv: number): string {
  if (lv === 0) return 'var(--track)'
  if (lv === 1) return 'color-mix(in srgb, var(--accent) 30%, #fff)'
  if (lv === 2) return 'color-mix(in srgb, var(--accent) 65%, #fff)'
  return 'var(--accent)'
}
export function Heatmap({ levels }: { levels: number[] }) {
  return (
    <div className="grid grid-flow-col grid-rows-7 gap-1">
      {levels.map((lv, i) => <div key={i} data-cell className="h-3 w-3 rounded-sm" style={{ background: color(lv) }} />)}
    </div>
  )
}
