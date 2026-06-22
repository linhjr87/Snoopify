import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const TYPES = ['Từ vựng', 'Cụm từ', 'Ngữ pháp', 'Lỗi']

export function QuickAdd() {
  const [selected, setSelected] = useState('Từ vựng')
  const nav = useNavigate()

  return (
    <section style={{ border: '1px solid var(--line)', borderRadius: '14px', background: 'var(--surface)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '22px', flexWrap: 'wrap', boxShadow: '0 1px 2px rgba(40,35,25,0.03)', animation: 'fadeUp .6s ease both', animationDelay: '.18s' }}>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--accent,#2f5d4e)" strokeWidth="1.8" strokeLinecap="round"><path d="M9 3.5v11M3.5 9h11" /></svg>
      <div style={{ flex: 1, minWidth: '200px', color: 'var(--muted)', fontSize: '15px' }}>Thêm nhanh một từ, cụm từ hay câu mẫu…</div>
      <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
        {TYPES.map((type) => (
          <span
            key={type}
            onClick={() => setSelected(type)}
            style={selected === type
              ? { fontSize: '13px', border: '1px solid var(--accent,#2f5d4e)', color: 'var(--accent,#2f5d4e)', borderRadius: '999px', padding: '4px 12px', background: 'var(--accent-soft,#e9f0ec)', cursor: 'pointer' }
              : { fontSize: '13px', border: '1px solid var(--line)', color: 'var(--muted)', borderRadius: '999px', padding: '4px 12px', cursor: 'pointer' }
            }
          >
            {type}
          </span>
        ))}
      </div>
      <button
        onClick={() => nav('/add')}
        style={{ border: '1px solid var(--line)', borderRadius: '9px', background: 'var(--surface)', padding: '8px 16px', fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: '14px', cursor: 'pointer', transition: 'background .15s ease' }}
      >
        Lưu
      </button>
    </section>
  )
}
