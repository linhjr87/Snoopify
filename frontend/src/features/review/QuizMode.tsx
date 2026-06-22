import { useAppStore } from '../../store/useAppStore'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { quizIsRight } from '../../lib/grading'
import type { SessionItem } from '../../data/seed'
export function QuizMode({ cur, isLast }: { cur: SessionItem; isLast: boolean }) {
  const pick = useAppStore((s) => s.quizPick)
  const pickQuiz = useAppStore((s) => s.pickQuiz)
  const advance = useAppStore((s) => s.advanceSession)
  const answered = pick != null
  const right = quizIsRight(pick, cur.quiz.correct)
  const correctLabel = (cur.quiz.options.find((o) => o[0] === cur.quiz.correct) || ['', ''])[1]
  return (
    <Card className="space-y-4 p-6">
      <div className="text-lg font-semibold text-ink">Chọn nghĩa đúng của "{cur.word}"</div>
      <div className="space-y-2">
        {cur.quiz.options.map(([key, label]) => {
          const isCorrect = key === cur.quiz.correct
          const isPicked = pick === key
          let cls = 'border-line'
          if (answered) cls = isCorrect ? 'border-[#3f8f5b] bg-[#eaf3ec] text-[#2f6b43]' : isPicked ? 'border-rust bg-[#f6e6e2] text-rust' : 'opacity-50'
          return (
            <button key={key} disabled={answered} onClick={() => pickQuiz(key)}
              className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-ink ${cls}`}>
              <span className="font-semibold">{key}</span><span>{label}</span>
              {answered && isCorrect && <span className="ml-auto text-[#3f8f5b]">✓</span>}
              {answered && isPicked && !isCorrect && <span className="ml-auto text-rust">✕</span>}
            </button>
          )
        })}
      </div>
      {answered && (
        <div className={`flex items-center justify-between rounded-xl border px-4 py-3 ${right ? 'border-[#3f8f5b] bg-[#eaf3ec]' : 'border-rust bg-[#f6e6e2]'}`}>
          <span className={`font-semibold ${right ? 'text-[#2f6b43]' : 'text-rust'}`}>
            {right ? `Chính xác — "${cur.word}".` : `Chưa đúng. Đáp án: "${correctLabel}".`}
          </span>
          <Button onClick={() => advance(right)}>{isLast ? 'Xem kết quả →' : 'Tiếp theo →'}</Button>
        </div>
      )}
    </Card>
  )
}
