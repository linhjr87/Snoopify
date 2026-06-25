'use client'
import { useT } from '../../i18n/useT'
import { AddCardForm } from './AddCardForm'
import type { DeckOut } from '../../lib/api-types'

export default function AddScreen({ decks }: { decks: DeckOut[] }) {
  const t = useT()
  return (
    <div style={{ animation: 'fadeUp .45s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
            {t.decks} · Business English
          </div>
          <h1 style={{ margin: 0, fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 32, letterSpacing: '-0.01em' }}>
            {t.addTitle}
          </h1>
        </div>
        <button
          style={{
            border: '1px solid var(--line)', borderRadius: 11, background: 'var(--surface)',
            color: 'var(--ink)', padding: '11px 16px',
            fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, fontSize: 14,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 2.5v8M5.5 7L9 10.5 12.5 7M3.5 14h11" />
          </svg>
          {t.importJson}
        </button>
      </div>
      <AddCardForm decks={decks} />
    </div>
  )
}
