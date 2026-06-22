import { Card } from '../../components/ui/Card'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { mastery } from '../../data/seed'
export function MasteryLevels() {
  const total = mastery.reduce((s, m) => s + m.n, 0)
  return (
    <Card className="p-5">
      <div className="mb-3 text-sm font-semibold text-ink">Mức độ thành thạo</div>
      <div className="space-y-3">
        {mastery.map((m) => (
          <div key={m.label}>
            <div className="flex justify-between text-sm text-ink"><span>{m.label}</span><span>{m.n}</span></div>
            <ProgressBar value={Math.round((m.n / total) * 100)} />
          </div>
        ))}
      </div>
    </Card>
  )
}
