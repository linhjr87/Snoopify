'use client'
import { useT } from '../../i18n/useT'
import { DeckCard, type DeckCardProps } from './DeckCard'

function NewDeckTile({ onClick }: { onClick?: () => void }) {
  const t = useT()
  return (
    <button type="button" className="deck" onClick={onClick} style={{
      border: '1.5px dashed var(--line)', borderRadius: '16px', background: 'transparent',
      padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '8px',
      color: 'var(--muted)', minHeight: '138px', fontFamily: 'inherit',
    }}>
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M11 4.5v13M4.5 11h13" />
      </svg>
      <div style={{ fontSize: '14px' }}>{t.createNewDeck}</div>
    </button>
  )
}

export function DeckList({ decks, onNewDeck }: { decks: DeckCardProps[]; onNewDeck?: () => void }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '18px' }}>
      {decks.map((d, i) => <DeckCard key={d.name + i} {...d} />)}
      <NewDeckTile onClick={onNewDeck} />
    </div>
  )
}
