import { useRecentCards } from './queries'
import { formatRelativeVi } from '../../lib/format'

const tagStyle: React.CSSProperties = {
  fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase',
  color: 'var(--accent,#2f5d4e)', background: 'var(--accent-soft,#e9f0ec)',
  borderRadius: '6px', padding: '4px 8px', fontWeight: 600, flex: 'none', marginTop: '2px',
}

export function RecentlyAdded() {
  const { data } = useRecentCards()
  const items = data ?? []
  return (
    <section style={{ flex: '1.5', minWidth: '380px', border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--surface)', padding: '24px', boxShadow: '0 1px 2px rgba(40,35,25,0.03)', animation: 'fadeUp .6s ease both', animationDelay: '.24s' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <h2 style={{ margin: 0, fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: '20px' }}>Đã thêm gần đây</h2>
        <span style={{ fontSize: '13px', color: 'var(--accent,#2f5d4e)', cursor: 'pointer' }}>Xem tất cả →</span>
      </div>
      {items.length === 0 && <div style={{ color: 'var(--muted)', fontSize: 14, padding: '16px 0' }}>Chưa có thẻ nào.</div>}
      {items.map((c, i) => (
        <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px 0', borderBottom: i < items.length - 1 ? '1px solid var(--line)' : undefined }}>
          <span style={tagStyle}>Từ vựng</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '16px' }}>
              {c.word}
              {c.phonetic && <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--muted)', fontWeight: 400 }}> {c.phonetic}</span>}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '2px' }}>{c.meaning}</div>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--muted)', flex: 'none' }}>{formatRelativeVi(c.created_at)}</span>
        </div>
      ))}
    </section>
  )
}
