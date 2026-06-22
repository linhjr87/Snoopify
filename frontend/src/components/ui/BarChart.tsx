export function BarChart({ bars }: { bars: { label: string; h: number }[] }) {
  return (
    <div className="flex items-end gap-3" style={{ height: 140 }}>
      {bars.map((b, i) => (
        <div key={b.label} className="flex flex-1 flex-col items-center gap-2">
          <div className="flex w-full flex-1 items-end">
            <div className="w-full rounded-t-md" style={{
              height: `${b.h}%`,
              background: i < 5 ? 'var(--accent)' : 'transparent',
              border: i < 5 ? 'none' : '1.5px dashed var(--line)',
            }} />
          </div>
          <span className="text-xs text-muted">{b.label}</span>
        </div>
      ))}
    </div>
  )
}
