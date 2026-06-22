export function SpacedRepetitionRating({ onRate }: { onRate: (correct: boolean) => void }) {
  const opts: [string, string, boolean, string, string][] = [
    ['Quên', 'ôn lại ngay', false, 'var(--rust)', 'var(--rust)'],
    ['Mơ hồ', 'sau 1 ngày', true, 'var(--gold)', 'var(--gold)'],
    ['Nhớ', 'sau 4 ngày', true, '#3f8f5b', '#2f6b43'],
  ]
  return (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
      {opts.map(([label, sub, correct, borderColor, textColor]) => (
        <button
          key={label}
          onClick={() => onRate(correct)}
          style={{
            border: `1px solid ${borderColor}`,
            color: textColor,
            borderRadius: '12px',
            background: 'var(--surface)',
            padding: '12px 24px',
            fontFamily: "'Hanken Grotesk', sans-serif",
            fontWeight: 600,
            cursor: 'pointer',
            textAlign: 'center',
            transition: 'background .15s ease',
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
