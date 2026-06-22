import { Card } from '../../components/ui/Card'

const DAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

export function Streak() {
  return (
    <Card className="p-5">
      <div className="text-sm font-semibold text-ink">Chuỗi học ◆ 12 ngày liên tục</div>
      <div className="mt-3 flex gap-1.5">
        {DAYS.map((d) => (
          <span
            key={d}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-xs font-semibold text-accent"
          >
            {d}
          </span>
        ))}
      </div>
    </Card>
  )
}
