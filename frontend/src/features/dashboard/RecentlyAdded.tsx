// Tag styles matching export exactly
const tagStyle = (type: string): React.CSSProperties => {
  if (type === 'Từ vựng') return { fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--accent,#2f5d4e)', background: 'var(--accent-soft,#e9f0ec)', borderRadius: '6px', padding: '4px 8px', fontWeight: 600, flex: 'none', marginTop: '2px' }
  if (type === 'Idiom') return { fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--gold)', background: '#f6efd6', borderRadius: '6px', padding: '4px 8px', fontWeight: 600, flex: 'none', marginTop: '2px' }
  if (type === 'Lỗi') return { fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--rust)', background: '#f6e6e2', borderRadius: '6px', padding: '4px 8px', fontWeight: 600, flex: 'none', marginTop: '2px' }
  return { fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--muted)', background: 'var(--paper)', borderRadius: '6px', padding: '4px 8px', fontWeight: 600, flex: 'none', marginTop: '2px' }
}

// Per-item sub display: export shows word + phonetic on first line, meaning on second
const ITEMS = [
  { type: 'Từ vựng', word: 'resilient', phonetic: '/rɪˈzɪl.i.ənt/', meaning: '(adj) có khả năng phục hồi nhanh; kiên cường', when: 'hôm nay' },
  { type: 'Idiom', word: 'to beat around the bush', phonetic: '', meaning: 'nói vòng vo, không vào thẳng vấn đề', when: 'hôm qua' },
  { type: 'Lỗi', word: '"much" vs "many"', phonetic: '', meaning: 'hay nhầm với danh từ đếm được / không đếm được', when: '2 ngày' },
]

export function RecentlyAdded() {
  return (
    <section style={{ flex: '1.5', minWidth: '380px', border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--surface)', padding: '24px', boxShadow: '0 1px 2px rgba(40,35,25,0.03)', animation: 'fadeUp .6s ease both', animationDelay: '.24s' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
        <h2 style={{ margin: 0, fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: '20px' }}>Đã thêm gần đây</h2>
        <span style={{ fontSize: '13px', color: 'var(--accent,#2f5d4e)', cursor: 'pointer' }}>Xem tất cả →</span>
      </div>

      {ITEMS.map((item, i) => (
        <div key={item.word} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '16px 0', borderBottom: i < ITEMS.length - 1 ? '1px solid var(--line)' : undefined }}>
          <span style={tagStyle(item.type)}>{item.type}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '16px' }}>
              {item.word}
              {item.phonetic && <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--muted)', fontWeight: 400 }}> {item.phonetic}</span>}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '2px' }}>{item.meaning}</div>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--muted)', flex: 'none' }}>{item.when}</span>
        </div>
      ))}
    </section>
  )
}
