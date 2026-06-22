import { useNavigate } from 'react-router-dom'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { needsReview } from '../../data/seed'
export function NeedsReview() {
  const nav = useNavigate()
  return (
    <Card className="p-5">
      <div className="mb-3 text-sm font-semibold text-ink">Cần ôn gấp</div>
      <div className="space-y-2">
        {needsReview.map((n) => (
          <div key={n.word} className="flex justify-between text-sm"><span className="text-ink">{n.word}</span><span className="text-rust">{n.detail}</span></div>
        ))}
      </div>
      <div className="mt-3"><Button onClick={() => nav('/review')}>Ôn ngay nhóm này</Button></div>
    </Card>
  )
}
