'use client'
import { useRouter } from 'next/navigation'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'

export function SessionComplete({ correct, total }: { correct: number; total: number }) {
  const t = useT()
  const router = useRouter()
  const resetSession = useAppStore((s) => s.resetSession)
  const accuracy = total ? Math.round((correct / total) * 100) : 0

  // Starting a fresh session must refetch the due cards — router.refresh() re-runs
  // the server page fetch of /review/session (the just-graded cards are now rescheduled).
  const reviewAgain = () => { resetSession(); router.refresh() }

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', animation: 'fadeUp .45s ease both' }}>
      <div style={{
        border: '1px solid var(--line)', borderRadius: '20px', background: 'var(--surface)',
        padding: '48px 40px', textAlign: 'center', boxShadow: '0 14px 34px -24px rgba(40,35,25,0.5)',
      }}>
        <div style={{ fontSize: '12px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '16px' }}>
          {t.sessionComplete}
        </div>
        <div style={{ fontFamily: "'Newsreader', serif", fontSize: '64px', fontWeight: 500, lineHeight: 1, color: 'var(--accent,#2f5d4e)' }}>
          {correct}
          <span style={{ color: 'var(--muted)', fontSize: '38px' }}>/{total}</span>
        </div>
        <div style={{ fontSize: '16px', color: 'var(--muted)', marginTop: '10px' }}>
          {t.accuracyLabel(accuracy)}
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '28px' }}>
          <button
            className="cta"
            onClick={reviewAgain}
            style={{
              border: 'none', borderRadius: '11px', background: 'var(--accent,#2f5d4e)', color: '#fff',
              padding: '12px 26px', fontFamily: "'Hanken Grotesk',sans-serif",
              fontWeight: 600, fontSize: '15px', cursor: 'pointer',
              transition: 'transform .18s ease, box-shadow .18s ease',
            }}
          >
            {t.reviewAgainCta}
          </button>
          <button
            className="ghost"
            onClick={() => { resetSession(); router.push('/') }}
            style={{
              border: '1px solid var(--line)', borderRadius: '11px', background: 'var(--surface)',
              padding: '12px 22px', fontFamily: "'Hanken Grotesk',sans-serif",
              fontWeight: 600, fontSize: '15px', color: 'var(--muted)', cursor: 'pointer',
            }}
          >
            {t.goHome}
          </button>
        </div>
      </div>
    </div>
  )
}
