import { useNavigate } from 'react-router-dom'
import { useT } from '../../i18n/useT'

export function TodaySession() {
  const t = useT()
  const nav = useNavigate()

  return (
    <section style={{ flex: '1.7', minWidth: '420px', border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--surface)', padding: '30px', display: 'flex', gap: '32px', alignItems: 'center', boxShadow: '0 1px 2px rgba(40,35,25,0.03)', animation: 'fadeUp .6s ease both', animationDelay: '.05s' }}>
      {/* Progress ring */}
      <div style={{ position: 'relative', width: '144px', height: '144px', flex: 'none' }}>
        <svg width="144" height="144" viewBox="0 0 144 144">
          <circle cx="72" cy="72" r="60" fill="none" stroke="var(--line,#e8e3d8)" strokeWidth="11" />
          <circle cx="72" cy="72" r="60" fill="none" stroke="var(--accent,#2f5d4e)" strokeWidth="11" strokeLinecap="round" strokeDasharray="376.99" strokeDashoffset="251" transform="rotate(-90 72 72)" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'var(--num-font)', fontSize: '34px', fontWeight: 600, lineHeight: 1 }}>8<span style={{ color: 'var(--muted)', fontSize: '20px' }}>/24</span></div>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '3px' }}>đã ôn</div>
        </div>
      </div>

      {/* Info */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '7px' }}>{t.todaySession}</div>
        <div style={{ fontFamily: "'Newsreader',serif", fontSize: '27px', fontWeight: 500, letterSpacing: '-0.01em', marginBottom: '6px' }}>Còn 16 thẻ đến hạn</div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <span style={{ fontSize: '13px', color: 'var(--muted)', border: '1px solid var(--line)', borderRadius: '999px', padding: '3px 11px' }}>18 từ vựng</span>
          <span style={{ fontSize: '13px', color: 'var(--muted)', border: '1px solid var(--line)', borderRadius: '999px', padding: '3px 11px' }}>4 ngữ pháp</span>
          <span style={{ fontSize: '13px', color: 'var(--muted)', border: '1px solid var(--line)', borderRadius: '999px', padding: '3px 11px' }}>2 cụm từ</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => nav('/review')}
            style={{ border: 'none', borderRadius: '11px', background: 'var(--accent,#2f5d4e)', color: '#fff', padding: '13px 26px', fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: '15px', cursor: 'pointer', transition: 'transform .18s ease, box-shadow .18s ease', display: 'flex', alignItems: 'center', gap: '9px' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3 2.2v9.6a.5.5 0 0 0 .76.43l7.7-4.8a.5.5 0 0 0 0-.86l-7.7-4.8A.5.5 0 0 0 3 2.2z" /></svg>
            {t.startReview}
          </button>
          <span style={{ fontSize: '14px', color: 'var(--muted)' }}>≈ 8 phút</span>
        </div>
      </div>
    </section>
  )
}
