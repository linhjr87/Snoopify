export function StatTile({ value, label, serif = true }: { value: string; label: string; serif?: boolean }) {
  return (
    <div>
      <div className={`text-3xl ${serif ? 'font-serif' : 'font-sans'} text-ink`}>{value}</div>
      <div className="mt-1 text-sm text-muted">{label}</div>
    </div>
  )
}
