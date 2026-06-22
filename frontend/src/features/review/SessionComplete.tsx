import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'

export function SessionComplete({ correct, total }: { correct: number; total: number }) {
  const nav = useNavigate()
  const resetSession = useAppStore((s) => s.resetSession)
  const accuracy = total ? Math.round((correct / total) * 100) : 0

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', animation: 'fadeUp .45s ease both' }}>
      <div style={{
        border: '1px solid var(--line)', borderRadius: '20px', background: 'var(--surface)',
        padding: '48px 40px', textAlign: 'center', boxShadow: '0 14px 34px -24px rgba(40,35,25,0.5)',
      }}>
        <div style={{ fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '16px' }}>
          Hoàn thành phiên
        </div>
        <div style={{ fontFamily: "'Newsreader', serif", fontSize: '64px', fontWeight: 500, lineHeight: 1, color: 'var(--accent,#2f5d4e)' }}>
          {correct}
          <span style={{ color: 'var(--muted)', fontSize: '38px' }}>/{total}</span>
        </div>
        <div style={{ fontSize: '16px', color: 'var(--muted)', marginTop: '10px' }}>
          câu đúng · {accuracy}% chính xác
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '28px' }}>
          <button
            className="cta"
            onClick={() => resetSession()}
            style={{
              border: 'none', borderRadius: '11px', background: 'var(--accent,#2f5d4e)', color: '#fff',
              padding: '12px 26px', fontFamily: "'Hanken Grotesk',sans-serif",
              fontWeight: 600, fontSize: '15px', cursor: 'pointer',
              transition: 'transform .18s ease, box-shadow .18s ease',
            }}
          >
            Học lại
          </button>
          <button
            className="ghost"
            onClick={() => { resetSession(); nav('/') }}
            style={{
              border: '1px solid var(--line)', borderRadius: '11px', background: 'var(--surface)',
              padding: '12px 22px', fontFamily: "'Hanken Grotesk',sans-serif",
              fontWeight: 600, fontSize: '15px', color: 'var(--muted)', cursor: 'pointer',
            }}
          >
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  )
}
