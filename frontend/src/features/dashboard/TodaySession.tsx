import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { ProgressRing } from '../../components/ui/ProgressRing'
import { Button } from '../../components/ui/Button'
import { useT } from '../../i18n/useT'

export function TodaySession() {
  const t = useT(); const nav = useNavigate()
  return (
    <Card className="flex items-center gap-6 p-6">
      <ProgressRing value={8} max={24} label="8/24" />
      <div className="flex-1">
        <div className="text-xs uppercase tracking-wide text-muted">{t.todaySession}</div>
        <div className="mt-1 text-ink">Còn 16 thẻ đến hạn</div>
        <div className="text-sm text-muted">18 từ vựng · 4 ngữ pháp · 2 cụm từ</div>
        <div className="mt-3 flex items-center gap-3">
          <Button onClick={() => nav('/review')}>{t.startReview}</Button>
          <span className="text-sm text-muted">≈ 8 phút</span>
        </div>
      </div>
    </Card>
  )
}
