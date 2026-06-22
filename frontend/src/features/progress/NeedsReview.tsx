import { useNavigate } from 'react-router-dom'
import { needsReview } from '../../data/seed'

export function NeedsReview() {
  const nav = useNavigate()
  return (
    <section style={{
      border: '1px solid var(--rust)', borderRadius: 18,
      background: 'var(--surface)', padding: 22,
      boxShadow: '0 1px 2px rgba(40,35,25,0.03)',
    }}>
      <h2 style={{ margin: '0 0 12px', fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 18, color: 'var(--rust)' }}>
        Cần ôn gấp
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 15 }}>
        {needsReview.map((n) => (
          <div key={n.word} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--ink)' }}>{n.word}</span>
            <span style={{ color: 'var(--rust)', fontSize: 13 }}>{n.detail}</span>
          </div>
        ))}
      </div>
      <button
        onClick={() => nav('/review')}
        style={{
          marginTop: 16, width: '100%',
          border: 'none', borderRadius: 11,
          background: 'var(--rust)', color: '#fff', padding: 11,
          fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, fontSize: 14,
          cursor: 'pointer', transition: 'transform .18s ease, box-shadow .18s ease',
        }}
        className="cta"
      >
        Ôn ngay nhóm này
      </button>
    </section>
  )
}
