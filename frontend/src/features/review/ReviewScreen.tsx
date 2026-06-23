import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import { ModeSwitcher } from './ModeSwitcher'
import { FlashcardMode } from './FlashcardMode'
import { QuizMode } from './QuizMode'
import { FillMode } from './FillMode'
import { SessionComplete } from './SessionComplete'
import { useSession } from './queries'

function ReviewMessage({ text, onHome }: { text: string; onHome?: () => void }) {
  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
      <div style={{ fontSize: '17px' }}>{text}</div>
      {onHome && (
        <button
          className="ghost"
          onClick={onHome}
          style={{
            marginTop: '20px', border: '1px solid var(--line)', borderRadius: '11px',
            background: 'var(--surface)', padding: '10px 20px',
            fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, color: 'var(--muted)', cursor: 'pointer',
          }}
        >
          Về trang chủ
        </button>
      )}
    </div>
  )
}

export default function ReviewScreen() {
  const t = useT()
  const nav = useNavigate()
  const reviewMode = useAppStore((s) => s.reviewMode)
  const sIndex = useAppStore((s) => s.sIndex)
  const sCorrect = useAppStore((s) => s.sCorrect)
  const gradeError = useAppStore((s) => s.gradeError)
  const resetSession = useAppStore((s) => s.resetSession)
  const setGradeError = useAppStore((s) => s.setGradeError)
  const { data, isLoading, isError } = useSession()

  // The session cursor (sIndex/sCorrect) is store state that outlives any single
  // fetched session — it persists across reloads and survives route changes. Reset
  // it whenever a session with *different content* loads, otherwise a stale cursor
  // points into the wrong card set (wrong card, carried-over score, or — if the
  // stale index is past the new end — an instant, inescapable "session complete").
  const sessionKey = data ? data.map((c) => c.cardId).join('|') : null
  useEffect(() => {
    if (sessionKey !== null) resetSession()
  }, [sessionKey, resetSession])

  if (isLoading) return <ReviewMessage text="Đang tải phiên ôn tập…" />
  if (isError) return <ReviewMessage text="Không tải được phiên ôn tập. Thử lại sau." onHome={() => nav('/')} />

  const session = data ?? []
  const total = session.length

  if (total === 0) return <ReviewMessage text="Không có thẻ nào đến hạn ôn tập. Quay lại sau nhé!" onHome={() => nav('/')} />
  if (sIndex >= total) return <SessionComplete correct={sCorrect} total={total} />

  const cur = session[sIndex]
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

      {/* Session label + score */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', marginBottom: '20px' }}>
        <span style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>
          Đến hạn hôm nay
        </span>
        <span style={{ fontSize: '12px', color: 'var(--accent,#2f5d4e)', fontWeight: 700 }}>
          · {sCorrect} đúng
        </span>
      </div>

      {/* Mode switcher */}
      <div style={{ display: 'flex', gap: '9px', justifyContent: 'center', marginBottom: '24px' }}>
        <ModeSwitcher />
      </div>

      {/* Non-blocking grade-save warning (the session keeps advancing optimistically) */}
      {gradeError && (
        <div
          role="alert"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
            marginBottom: '18px', padding: '11px 16px', borderRadius: '11px',
            background: '#f6e6e2', border: '1px solid var(--rust)', color: 'var(--rust)',
            fontSize: '14px', fontWeight: 600,
          }}
        >
          <span>Chưa lưu được kết quả gần nhất — kiểm tra kết nối.</span>
          <button
            onClick={() => setGradeError(false)}
            aria-label="Đóng cảnh báo"
            style={{
              border: 'none', background: 'transparent', color: 'var(--rust)',
              cursor: 'pointer', fontSize: '18px', lineHeight: 1, flex: 'none',
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Active mode */}
      {reviewMode === 'flash' && <FlashcardMode cur={cur} />}
      {reviewMode === 'quiz' && <QuizMode cur={cur} isLast={isLast} />}
      {reviewMode === 'fill' && <FillMode cur={cur} isLast={isLast} />}
    </div>
  )
}
