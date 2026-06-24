'use client'
import { useAppStore } from '../../store/useAppStore'
import { quizIsRight } from '../../lib/grading'
import type { SessionCard } from '../../lib/adapters'
import { submitGrade } from './grade'

export function QuizMode({ cur, isLast }: { cur: SessionCard; isLast: boolean }) {
  const pick = useAppStore((s) => s.quizPick)
  const pickQuiz = useAppStore((s) => s.pickQuiz)
  const advance = useAppStore((s) => s.advanceSession)
  const answered = pick != null
  const right = quizIsRight(pick, cur.quiz.correct)

  const handleNext = () => {
    void submitGrade({ card_id: cur.cardId, rating: right ? 'remember' : 'forgot', mode: 'quiz', is_correct: right })
    advance(right)
  }

  const correctLabel = (cur.quiz.options.find((o) => o[0] === cur.quiz.correct) || ['', ''])[1]
  const nextLabel = isLast ? 'Xem kết quả →' : 'Tiếp theo →'

  const quizResultText = answered
    ? (right ? `Chính xác — "${cur.word}".` : `Chưa đúng. Đáp án: "${correctLabel}".`)
    : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Word prompt card */}
      <div style={{
        border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--surface)',
        padding: '28px', textAlign: 'center', boxShadow: '0 1px 2px rgba(40,35,25,0.03)',
      }}>
        <div style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '8px' }}>
          Chọn nghĩa đúng của
        </div>
        <div style={{ fontFamily: "'Newsreader', serif", fontSize: '40px', fontWeight: 500 }}>
          {cur.word}
        </div>
      </div>

      {/* Options */}
      {cur.quiz.options.map(([key, label]) => {
        const isCorrect = key === cur.quiz.correct
        const isPicked = pick === key
        let overrideStyle: React.CSSProperties = {}
        let mark = ''
        const markStyle: React.CSSProperties = { fontSize: '18px', fontWeight: 700, width: '18px', textAlign: 'center' }
        let markColor = ''
        if (answered) {
          if (isCorrect) {
            overrideStyle = { borderColor: '#3f8f5b', background: '#eaf3ec', color: '#2f6b43' }
            mark = '✓'; markColor = '#3f8f5b'
          } else if (isPicked) {
            overrideStyle = { borderColor: 'var(--rust)', background: '#f6e6e2', color: 'var(--rust)' }
            mark = '✕'; markColor = 'var(--rust)'
          } else {
            overrideStyle = { opacity: 0.5 }
          }
        }
        return (
          <button
            key={key}
            className="opt"
            onClick={() => { if (!answered) pickQuiz(key) }}
            style={{
              border: '1px solid var(--line,#e8e3d8)', borderRadius: '14px',
              background: 'var(--surface,#fffdf9)', padding: '16px 20px',
              textAlign: 'left', fontFamily: "'Hanken Grotesk',sans-serif",
              fontSize: '16px', color: 'var(--ink,#211f1b)', cursor: 'pointer',
              display: 'flex', gap: '13px', alignItems: 'center', width: '100%',
              transition: 'border-color .15s ease, background .15s ease, opacity .2s ease',
              ...overrideStyle,
            }}
          >
            <span style={{ fontFamily: 'var(--num-font)', color: 'var(--muted)', fontWeight: 600 }}>{key}</span>
            <span style={{ flex: 1 }}>{label}</span>
            {mark && <span style={{ ...markStyle, color: markColor }}>{mark}</span>}
          </button>
        )
      })}

      {/* Result banner */}
      {answered && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '14px', marginTop: '4px', padding: '14px 18px', borderRadius: '12px',
          background: right ? '#eaf3ec' : '#f6e6e2',
          border: `1px solid ${right ? '#3f8f5b' : 'var(--rust)'}`,
        }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: right ? '#2f6b43' : 'var(--rust)' }}>
            {quizResultText}
          </span>
          <button
            onClick={handleNext}
            style={{
              border: 'none', borderRadius: '9px', background: 'var(--ink,#211f1b)', color: '#fff',
              padding: '9px 18px', fontFamily: "'Hanken Grotesk',sans-serif",
              fontWeight: 600, fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap', flex: 'none',
            }}
          >
            {nextLabel}
          </button>
        </div>
      )}
    </div>
  )
}
