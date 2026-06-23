import { useAppStore } from '../../store/useAppStore'
import { fillIsRight } from '../../lib/grading'
import type { SessionCard } from '../../lib/adapters'
import { useGradeMutation } from './queries'

export function FillMode({ cur, isLast }: { cur: SessionCard; isLast: boolean }) {
  const value = useAppStore((s) => s.fillValue)
  const checked = useAppStore((s) => s.fillChecked)
  const setFill = useAppStore((s) => s.setFill)
  const checkFill = useAppStore((s) => s.checkFill)
  const advance = useAppStore((s) => s.advanceSession)
  const grade = useGradeMutation()
  const right = fillIsRight(value, cur.fill.answer)
  const fillDisplay = value || '______'
  const nextLabel = isLast ? 'Xem kết quả →' : 'Tiếp theo →'

  const fillBlankStyle: React.CSSProperties = {
    display: 'inline-block', minWidth: '150px', textAlign: 'center', padding: '0 6px',
    borderBottom: '2px solid ' + (checked ? (right ? '#3f8f5b' : 'var(--rust)') : 'var(--accent,#2f5d4e)'),
    color: checked ? (right ? '#2f6b43' : 'var(--rust)') : (value ? 'var(--ink)' : '#bdb8ab'),
  }

  const fillInputStyle: React.CSSProperties = {
    flex: 1,
    ...(checked ? { borderColor: right ? '#3f8f5b' : 'var(--rust)', background: 'var(--surface)' } : {}),
  }

  const fillResultText = right
    ? `Chính xác — "${cur.fill.answer}".`
    : `Chưa đúng. Đáp án: "${cur.fill.answer}".`

  const handleNext = () => {
    grade.mutate({ card_id: cur.cardId, rating: right ? 'remember' : 'forgot', mode: 'fill', is_correct: right })
    advance(right)
  }

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (checked) { handleNext() }
      else if (value.trim()) { checkFill() }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Sentence with blank */}
      <div style={{
        border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--surface)',
        padding: '30px', fontFamily: "'Newsreader', serif", fontSize: '22px', lineHeight: 1.7,
        boxShadow: '0 1px 2px rgba(40,35,25,0.03)',
      }}>
        {cur.fill.before}{' '}
        <span style={fillBlankStyle}>{fillDisplay}</span>
        {' '}{cur.fill.after}
      </div>

      {/* Hint */}
      <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
        Gõ từ còn thiếu · gợi ý: <span style={{ fontFamily: 'monospace' }}>{cur.fill.hint}</span>
      </div>

      {/* Input row */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <input
          aria-label="fill"
          className="field"
          placeholder="câu trả lời của bạn…"
          value={value}
          onChange={(e) => { if (!checked) setFill(e.target.value) }}
          onKeyDown={handleKey}
          style={{
            width: '100%', border: '1px solid var(--line,#e8e3d8)', borderRadius: '10px',
            padding: '11px 13px', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: '15px',
            color: 'var(--ink,#211f1b)', background: 'var(--paper,#f6f4ee)', outline: 'none',
            transition: 'border-color .15s ease, background .15s ease',
            ...fillInputStyle,
          }}
        />
        <button
          className="cta"
          disabled={!value}
          onClick={() => checkFill()}
          style={{
            border: 'none', borderRadius: '11px', background: 'var(--accent,#2f5d4e)', color: '#fff',
            padding: '12px 24px', fontFamily: "'Hanken Grotesk',sans-serif",
            fontWeight: 600, fontSize: '15px', cursor: value ? 'pointer' : 'not-allowed',
            opacity: value ? 1 : 0.5,
            transition: 'transform .18s ease, box-shadow .18s ease',
          }}
        >
          Kiểm tra
        </button>
      </div>

      {/* Result banner */}
      {checked && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: '14px', padding: '14px 18px', borderRadius: '12px',
          background: right ? '#eaf3ec' : '#f6e6e2',
          border: `1px solid ${right ? '#3f8f5b' : 'var(--rust)'}`,
        }}>
          <span style={{ fontSize: '15px', fontWeight: 600, color: right ? '#2f6b43' : 'var(--rust)' }}>
            {fillResultText}
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
