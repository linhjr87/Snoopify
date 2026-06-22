export function ProgressBar({ value, tone = 'accent', className = '' }: { value: number; tone?: 'accent' | 'rust'; className?: string }) {
  const w = Math.max(0, Math.min(100, value))
  const bg = tone === 'rust' ? 'var(--rust)' : 'var(--accent)'
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-track ${className}`}>
      <div data-fill className="h-full rounded-full" style={{ width: `${w}%`, background: bg }} />
    </div>
  )
}
