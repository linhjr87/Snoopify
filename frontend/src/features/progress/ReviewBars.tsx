import { Card } from '../../components/ui/Card'
import { BarChart } from '../../components/ui/BarChart'
import { weeklyBars } from '../../data/seed'
export function ReviewBars() {
  return (
    <Card className="p-5">
      <div className="mb-3 text-sm font-semibold text-ink">Lượt ôn mỗi ngày · tuần này</div>
      <BarChart bars={weeklyBars} />
    </Card>
  )
}
