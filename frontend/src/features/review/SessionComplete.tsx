import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
export function SessionComplete({ correct, total }: { correct: number; total: number }) {
  const nav = useNavigate()
  const resetSession = useAppStore((s) => s.resetSession)
  const accuracy = total ? Math.round((correct / total) * 100) : 0
  return (
    <Card className="space-y-4 p-10 text-center">
      <div className="text-xl font-semibold text-ink">Hoàn thành phiên</div>
      <div className="text-muted">{correct}/{total} câu đúng · {accuracy}% chính xác</div>
      <div className="flex justify-center gap-3">
        <Button onClick={() => resetSession()}>Học lại</Button>
        <Button variant="ghost" onClick={() => { resetSession(); nav('/') }}>Về trang chủ</Button>
      </div>
    </Card>
  )
}
