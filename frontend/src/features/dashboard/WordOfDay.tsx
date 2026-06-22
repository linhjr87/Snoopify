import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { wordOfDay } from '../../data/seed'
import { useAppStore } from '../../store/useAppStore'

export function WordOfDay() {
  const showWordOfDay = useAppStore((s) => (s as any).showWordOfDay ?? true)
  if (!showWordOfDay) return null
  return (
    <Card className="p-5">
      <div className="mb-2 text-xs uppercase tracking-wide text-muted">Từ của ngày</div>
      <div className="text-xl font-bold text-ink">{wordOfDay.word}</div>
      <div className="text-xs text-muted">{wordOfDay.phon}</div>
      <div className="mt-2 text-sm text-ink">{wordOfDay.meaning}</div>
      <div className="mt-1 text-xs italic text-muted">{wordOfDay.example}</div>
      <div className="mt-3">
        <Button variant="ghost">Nghe</Button>
      </div>
    </Card>
  )
}
