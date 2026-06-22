import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import type { ReviewMode } from '../../store/types'
export function ModeSwitcher() {
  const t = useT()
  const mode = useAppStore((s) => s.reviewMode)
  const setReviewMode = useAppStore((s) => s.setReviewMode)
  const defs: [ReviewMode, string][] = [['flash', t.flashcard], ['quiz', t.quiz], ['fill', t.fill]]
  return (
    <div className="flex gap-2">
      {defs.map(([k, label]) => (
        <button key={k} onClick={() => setReviewMode(k)}
          className={`rounded-xl border px-4 py-2 text-sm ${mode === k ? 'border-accent bg-accent-soft text-accent font-semibold' : 'border-line bg-surface text-muted'}`}>{label}</button>
      ))}
    </div>
  )
}
