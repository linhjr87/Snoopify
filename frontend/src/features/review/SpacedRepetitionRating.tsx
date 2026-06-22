export function SpacedRepetitionRating({ onRate }: { onRate: (correct: boolean) => void }) {
  const opts: [string, string, boolean][] = [
    ['Quên', 'ôn lại ngay', false],
    ['Mơ hồ', 'sau 1 ngày', true],
    ['Nhớ', 'sau 4 ngày', true],
  ]
  return (
    <div className="grid grid-cols-3 gap-3">
      {opts.map(([label, sub, correct]) => (
        <button key={label} onClick={() => onRate(correct)} className="rounded-xl border border-line bg-surface p-3 text-center hover:bg-paper">
          <div className="font-semibold text-ink">{label}</div>
          <div className="text-xs text-muted">{sub}</div>
        </button>
      ))}
    </div>
  )
}
