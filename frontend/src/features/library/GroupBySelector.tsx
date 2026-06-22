export type GroupBy = 'topic' | 'date' | 'mastery'
export function GroupBySelector({ value, onChange }: { value: GroupBy; onChange: (g: GroupBy) => void }) {
  const opts: [GroupBy, string][] = [['topic', 'Chủ đề'], ['date', 'Ngày học'], ['mastery', 'Độ thành thạo']]
  return (
    <div className="flex gap-2">
      {opts.map(([k, label]) => (
        <button key={k} onClick={() => onChange(k)}
          className={`rounded-lg px-3 py-1.5 text-sm ${value === k ? 'bg-accent-soft text-accent font-semibold' : 'text-muted'}`}>{label}</button>
      ))}
    </div>
  )
}
