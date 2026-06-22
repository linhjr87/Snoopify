import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import type { ReviewMode } from '../../store/types'

export function ModeSwitcher() {
  const t = useT()
  const mode = useAppStore((s) => s.reviewMode)
  const setReviewMode = useAppStore((s) => s.setReviewMode)
  const defs: [ReviewMode, string][] = [['flash', t.flashcard], ['quiz', t.quiz], ['fill', t.fill]]
  return (
    <>
      {defs.map(([k, label]) => {
        const active = mode === k
        return (
          <button
            key={k}
            onClick={() => setReviewMode(k)}
            style={{
              padding: '8px 18px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontFamily: "'Hanken Grotesk', sans-serif",
              fontSize: '14px',
              border: active ? '1px solid var(--accent)' : '1px solid var(--line)',
              background: active ? 'var(--accent-soft)' : 'var(--surface)',
              color: active ? 'var(--accent)' : 'var(--muted)',
              fontWeight: active ? 600 : 500,
            }}
          >
            {label}
          </button>
        )
      })}
    </>
  )
}
