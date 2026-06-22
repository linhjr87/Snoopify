export function Avatar({ name, streak }: { name: string; streak?: number }) {
  const initial = name.trim().charAt(0).toUpperCase()
  return (
    <div className="flex items-center gap-2">
      <div className="grid h-9 w-9 place-items-center rounded-full bg-accent text-sm font-semibold text-white">{initial}</div>
      <div className="leading-tight">
        <div className="text-sm font-semibold text-ink">{name}</div>
        {streak != null && <div className="text-xs text-muted">streak {streak} ngày</div>}
      </div>
    </div>
  )
}
