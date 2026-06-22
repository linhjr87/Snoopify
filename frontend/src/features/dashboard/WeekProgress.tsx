import { Card } from '../../components/ui/Card'
import { ProgressBar } from '../../components/ui/ProgressBar'

export function WeekProgress() {
  return (
    <Card className="p-5">
      <div className="mb-1 text-sm font-semibold text-ink">Tiến độ tuần 68%</div>
      <ProgressBar value={68} />
      <div className="mt-2 text-xs text-muted">Còn 2 ngày để đạt mục tiêu · 5 buổi/tuần</div>
      <div className="mt-3 text-xs text-muted">281 thẻ · 5 bộ</div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-paper p-3">
          <div className="text-base font-bold text-ink">486</div>
          <div className="text-xs text-muted">thẻ đã học</div>
        </div>
        <div className="rounded-lg bg-paper p-3">
          <div className="text-base font-bold text-ink">213</div>
          <div className="text-xs text-muted">đã thành thạo</div>
        </div>
      </div>
    </Card>
  )
}
