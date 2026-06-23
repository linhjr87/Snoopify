import type { Rating } from '../../lib/api-types'

export function SpacedRepetitionRating({
  onRate,
  disabled = false,
}: {
  onRate: (rating: Rating) => void
  disabled?: boolean
}) {
  const opts: [string, string, Rating, string, string][] = [
    ['Quên', 'ôn lại ngay', 'forgot', 'var(--rust)', 'var(--rust)'],
    ['Mơ hồ', 'sau 1 ngày', 'vague', 'var(--gold)', 'var(--gold)'],
    ['Nhớ', 'sau 4 ngày', 'remember', '#3f8f5b', '#2f6b43'],
  ]
  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
      {opts.map(([label, sub, rating, borderColor, textColor]) => (
        <button
          key={label}
          disabled={disabled}
          onClick={() => onRate(rating)}
          style={{
            border: `1px solid ${borderColor}`,
            color: textColor,
            borderRadius: '12px',
            background: 'var(--surface)',
            padding: '12px 24px',
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontWeight: 600,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
            textAlign: 'center',
            transition: 'background .15s ease, opacity .15s ease',
          }}
        >
          {label}
          <div style={{ fontSize: '12px', fontWeight: 400, color: 'var(--muted)', marginTop: '2px' }}>
            {sub}
          </div>
        </button>
      ))}
    </div>
  )
}
