import { useAppStore } from '../../store/useAppStore'
import { SpacedRepetitionRating } from './SpacedRepetitionRating'
import type { SessionCard } from '../../lib/adapters'
import type { Rating } from '../../lib/api-types'
import { submitGrade } from './grade'

export function FlashcardMode({ cur }: { cur: SessionCard }) {
  const flipped = useAppStore((s) => s.flipped)
  const flip = useAppStore((s) => s.flip)
  const advance = useAppStore((s) => s.advanceSession)

  const handleRate = (rating: Rating) => {
    void submitGrade({ card_id: cur.cardId, rating, mode: 'flash', is_correct: null })
    advance(rating !== 'forgot')
  }

  const cardInnerStyle: React.CSSProperties = {
    position: 'relative', width: '100%', minHeight: '340px',
    transition: 'transform .62s cubic-bezier(.2,.85,.25,1)',
    transformStyle: 'preserve-3d',
    transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '22px' }}>
      {/* Card with 3D flip */}
      <div onClick={() => flip()} style={{ width: '100%', perspective: '1600px', cursor: 'pointer' }}>
        <div style={cardInnerStyle}>
          {/* FRONT */}
          <div style={{
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
            border: '1px solid var(--line)', borderRadius: '20px', background: 'var(--surface)',
            padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', textAlign: 'center',
            boxShadow: '0 14px 34px -22px rgba(40,35,25,0.55)',
          }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '16px' }}>
              Nhấn để lật thẻ
            </div>
            <div style={{ fontFamily: "'Newsreader', serif", fontSize: '52px', fontWeight: 500, letterSpacing: '-0.01em' }}>
              {cur.word}
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '14px', color: 'var(--muted)', marginTop: '10px' }}>
              {cur.phon}
            </div>
            <div style={{ position: 'absolute', bottom: '16px', right: '18px', color: 'var(--muted)', opacity: 0.45 }}>
              <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 6A5.6 5.6 0 1 0 15.2 10" /><path d="M14.6 2.8v3.3h-3.2" />
              </svg>
            </div>
          </div>

          {/* BACK */}
          <div style={{
            position: 'absolute', inset: 0,
            backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            border: '1px solid var(--accent,#2f5d4e)', borderRadius: '20px',
            background: 'linear-gradient(165deg,var(--accent-soft,#e7efea),var(--surface))',
            padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', textAlign: 'center',
            boxShadow: '0 14px 34px -22px rgba(40,35,25,0.55)',
          }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent,#2f5d4e)', marginBottom: '16px' }}>
              Nghĩa
            </div>
            <div style={{ fontFamily: "'Newsreader', serif", fontSize: '27px', fontWeight: 500, marginBottom: '14px' }}>
              {cur.meaning}
            </div>
            <div style={{ fontSize: '16px', color: 'var(--muted)', fontStyle: 'italic', maxWidth: '440px' }}>
              &quot;{cur.example}&quot;
            </div>
          </div>
        </div>
      </div>

      {/* Rating buttons */}
      <SpacedRepetitionRating onRate={handleRate} />

      <div style={{ fontSize: '13px', color: 'var(--muted)' }}>
        Tự chấm để tính điểm phiên · spaced repetition
      </div>
    </div>
  )
}
