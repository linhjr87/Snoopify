import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import { ModeSwitcher } from './ModeSwitcher'
import { FlashcardMode } from './FlashcardMode'
import { QuizMode } from './QuizMode'
import { FillMode } from './FillMode'
import { SessionComplete } from './SessionComplete'
import { SESSION } from '../../data/seed'

export default function ReviewScreen() {
  const t = useT()
  const nav = useNavigate()
  const reviewMode = useAppStore((s) => s.reviewMode)
  const sIndex = useAppStore((s) => s.sIndex)
  const sCorrect = useAppStore((s) => s.sCorrect)
  const total = SESSION.length

  if (sIndex >= total) return <SessionComplete correct={sCorrect} total={total} />

  const cur = SESSION[sIndex]
  const isLast = sIndex >= total - 1
  const progressPct = Math.round((sIndex / total) * 100)

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', animation: 'fadeUp .45s ease both' }}>
      {/* Progress row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
        <button
          className="ghost"
          onClick={() => nav('/')}
          style={{
            border: '1px solid var(--line)', borderRadius: '9px', background: 'var(--surface)',
            padding: '7px 12px', fontFamily: "'Hanken Grotesk',sans-serif", fontSize: '13px',
            color: 'var(--muted)', cursor: 'pointer',
          }}
        >
          {t.exit}
        </button>
        <div style={{ flex: 1, height: '8px', borderRadius: '999px', background: 'var(--track)', overflow: 'hidden' }}>
          <div style={{
            width: progressPct + '%', height: '100%', background: 'var(--accent,#2f5d4e)',
            borderRadius: '999px', transition: 'width .4s cubic-bezier(.2,.8,.2,1)',
          }} />
        </div>
        <div style={{ fontFamily: 'var(--num-font)', fontSize: '15px', fontWeight: 600, color: 'var(--muted)' }}>
          {Math.min(sIndex + 1, total)} / {total}
        </div>
      </div>

      {/* Deck label + score */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', marginBottom: '20px' }}>
        <span style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Business English
        </span>
        <span style={{ fontSize: '12px', color: 'var(--accent,#2f5d4e)', fontWeight: 700 }}>
          · {sCorrect} đúng
        </span>
      </div>

      {/* Mode switcher */}
      <div style={{ display: 'flex', gap: '9px', justifyContent: 'center', marginBottom: '24px' }}>
        <ModeSwitcher />
      </div>

      {/* Active mode */}
      {reviewMode === 'flash' && <FlashcardMode cur={cur} />}
      {reviewMode === 'quiz' && <QuizMode cur={cur} isLast={isLast} />}
      {reviewMode === 'fill' && <FillMode cur={cur} isLast={isLast} />}
    </div>
  )
}
