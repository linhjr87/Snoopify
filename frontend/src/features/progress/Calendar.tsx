import { Card } from '../../components/ui/Card'
import { Heatmap } from '../../components/ui/Heatmap'
import { makeHeatmap } from '../../data/seed'
export function Calendar() {
  return (
    <Card className="p-5">
      <div className="mb-3 text-sm font-semibold text-ink">Lịch học · 18 tuần qua</div>
      <Heatmap levels={makeHeatmap()} />
      <div className="mt-2 flex items-center gap-2 text-xs text-muted">ít <span className="inline-block h-3 w-3 rounded-sm bg-track" /><span className="inline-block h-3 w-3 rounded-sm bg-accent" /> nhiều</div>
    </Card>
  )
}
