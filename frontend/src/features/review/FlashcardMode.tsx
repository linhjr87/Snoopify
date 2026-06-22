import { useAppStore } from '../../store/useAppStore'
import { Card } from '../../components/ui/Card'
import { SpacedRepetitionRating } from './SpacedRepetitionRating'
import type { SessionItem } from '../../data/seed'
export function FlashcardMode({ cur }: { cur: SessionItem }) {
  const flipped = useAppStore((s) => s.flipped)
  const flip = useAppStore((s) => s.flip)
  const advance = useAppStore((s) => s.advanceSession)
  return (
    <div className="space-y-4">
      <Card className="cursor-pointer p-10 text-center" >
        <div onClick={() => flip()}>
          {!flipped ? (
            <>
              <div className="text-3xl font-semibold text-ink">{cur.word}</div>
              <div className="mt-1 text-muted">{cur.phon}</div>
              <div className="mt-4 text-sm text-muted">Nhấn để lật thẻ</div>
            </>
          ) : (
            <>
              <div className="text-xs uppercase tracking-wide text-muted">Nghĩa</div>
              <div className="mt-1 text-xl text-ink">{cur.meaning}</div>
              <div className="mt-3 italic text-muted">"{cur.example}"</div>
            </>
          )}
        </div>
      </Card>
      {flipped && <SpacedRepetitionRating onRate={(c) => advance(c)} />}
      <div className="text-center text-xs text-muted">Tự chấm để tính điểm phiên · spaced repetition</div>
    </div>
  )
}
