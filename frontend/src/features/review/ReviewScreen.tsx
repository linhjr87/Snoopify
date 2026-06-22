import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import { ProgressBar } from '../../components/ui/ProgressBar'
import { ModeSwitcher } from './ModeSwitcher'
import { FlashcardMode } from './FlashcardMode'
import { QuizMode } from './QuizMode'
import { FillMode } from './FillMode'
import { SessionComplete } from './SessionComplete'
import { SESSION } from '../../data/seed'
export default function ReviewScreen() {
  const t = useT(); const nav = useNavigate()
  const { reviewMode, sIndex, sCorrect } = useAppStore((s) => ({ reviewMode: s.reviewMode, sIndex: s.sIndex, sCorrect: s.sCorrect }))
  const total = SESSION.length
  if (sIndex >= total) return <SessionComplete correct={sCorrect} total={total} />
  const cur = SESSION[sIndex]
  const isLast = sIndex >= total - 1
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between">
        <ModeSwitcher />
        <button className="text-sm text-muted hover:text-ink" onClick={() => nav('/')}>{t.exit}</button>
      </div>
      <div className="flex items-center gap-3 text-sm text-muted">
        <span>{Math.min(sIndex + 1, total)} / {total}</span>
        <div className="flex-1"><ProgressBar value={Math.round((sIndex / total) * 100)} /></div>
        <span>Business English · {sCorrect} đúng</span>
      </div>
      {reviewMode === 'flash' && <FlashcardMode cur={cur} />}
      {reviewMode === 'quiz' && <QuizMode cur={cur} isLast={isLast} />}
      {reviewMode === 'fill' && <FillMode cur={cur} isLast={isLast} />}
    </div>
  )
}
