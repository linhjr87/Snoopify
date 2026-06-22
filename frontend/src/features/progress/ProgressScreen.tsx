import { useT } from '../../i18n/useT'
import { Card } from '../../components/ui/Card'
import { StatTile } from '../../components/ui/StatTile'
import { Calendar } from './Calendar'
import { ReviewBars } from './ReviewBars'
import { MasteryLevels } from './MasteryLevels'
import { NeedsReview } from './NeedsReview'
export default function ProgressScreen() {
  const t = useT()
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-ink">{t.progressTitle}</h1>
      <Card className="grid grid-cols-2 gap-6 p-6 md:grid-cols-4">
        <StatTile value="12" label="ngày liên tục" />
        <StatTile value="486" label="thẻ đã học" />
        <StatTile value="88%" label="độ chính xác" />
        <StatTile value="1.640" label="lượt ôn tổng" />
      </Card>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Calendar /><ReviewBars /><MasteryLevels /><NeedsReview />
      </div>
    </div>
  )
}
