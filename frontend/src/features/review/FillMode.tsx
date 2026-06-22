import { useAppStore } from '../../store/useAppStore'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { fillIsRight } from '../../lib/grading'
import type { SessionItem } from '../../data/seed'
export function FillMode({ cur, isLast }: { cur: SessionItem; isLast: boolean }) {
  const value = useAppStore((s) => s.fillValue)
  const checked = useAppStore((s) => s.fillChecked)
  const setFill = useAppStore((s) => s.setFill)
  const checkFill = useAppStore((s) => s.checkFill)
  const advance = useAppStore((s) => s.advanceSession)
  const right = fillIsRight(value, cur.fill.answer)
  return (
    <Card className="space-y-4 p-6">
      <div className="text-lg text-ink">
        {cur.fill.before} <span className="font-semibold text-accent">{value || '______'}</span> {cur.fill.after}
      </div>
      <div className="flex gap-2">
        <input aria-label="fill" value={value} onChange={(e) => setFill(e.target.value)} disabled={checked}
          className="flex-1 rounded-xl border border-line bg-paper px-3 py-2 text-ink" />
        <Button disabled={!value} onClick={() => checkFill()}>Kiểm tra</Button>
      </div>
      <div className="text-xs text-muted">Gõ từ còn thiếu · gợi ý: {cur.fill.hint}</div>
      {checked && (
        <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${right ? 'border-[#3f8f5b] bg-[#eaf3ec]' : 'border-rust bg-[#f6e6e2]'}`}>
          <span className={`font-semibold ${right ? 'text-[#2f6b43]' : 'text-rust'}`}>
            {right ? `Chính xác — "${cur.fill.answer}".` : `Chưa đúng. Đáp án: "${cur.fill.answer}".`}
          </span>
          <Button onClick={() => advance(right)}>{isLast ? 'Xem kết quả →' : 'Tiếp theo →'}</Button>
        </div>
      )}
    </Card>
  )
}
