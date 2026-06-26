'use client'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import { apiPost } from '../../lib/api'
import { DeckList } from './DeckList'
import { GroupBySelector, type GroupBy } from './GroupBySelector'
import { ImportJsonModal } from './ImportJsonModal'
import { toDeckCard } from './deck-view'
import type { DeckCardProps } from './DeckCard'
import type { DeckOut } from '../../lib/api-types'

export default function LibraryScreen({ decks: apiDecks }: { decks: DeckOut[] }) {
  const t = useT()
  const lang = useAppStore((s) => s.lang)
  const router = useRouter()
  const setPanel = useAppStore((s) => s.setPanel)
  const [group, setGroup] = useState<GroupBy>('topic')
  const [filterText, setFilterText] = useState('')

  const decks: DeckCardProps[] = useMemo(() => {
    const needle = filterText.trim().toLowerCase()
    const sorted = [...apiDecks].sort((a: DeckOut, b: DeckOut) => {
      if (group === 'mastery') return b.mastery_pct - a.mastery_pct
      if (group === 'date') return b.created_at.localeCompare(a.created_at)
      return a.topic.localeCompare(b.topic)
    })
    return sorted.filter((d) => d.name.toLowerCase().includes(needle)).map((d) => toDeckCard(d, lang))
  }, [apiDecks, filterText, group, lang])

  const totalCards = apiDecks.reduce((sum, deck) => sum + deck.count, 0)
  const totalDecks = apiDecks.length

  const onNewDeck = async () => {
    const name = window.prompt(t.newDeckPrompt)?.trim()
    if (!name) return
    try {
      await apiPost<DeckOut>('/decks', { name })
      router.refresh()
    } catch {
      window.alert(t.newDeckFailed)
    }
  }

  return (
    <div style={{ animation: 'fadeUp .45s ease both' }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '18px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px' }}>
            {t.libraryStats(totalCards, totalDecks)}
          </div>
          <h1 style={{ margin: 0, fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: '32px' }}>
            {t.libraryTitle}
          </h1>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Search */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            border: '1px solid var(--line)', borderRadius: '999px',
            padding: '8px 15px', background: 'var(--surface)',
            color: 'var(--muted)', fontSize: '14px', minWidth: '200px',
          }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <circle cx="7" cy="7" r="4.5" />
              <path d="M10.5 10.5L14 14" />
            </svg>
            <input
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder={t.filterDecksPlaceholder}
              style={{ border: 'none', outline: 'none', background: 'transparent', color: 'var(--muted)', fontSize: '14px', width: '100%' }}
            />
          </div>
          {/* Import JSON */}
          <button
            onClick={() => setPanel('importOpen', true)}
            style={{
              border: '1px solid var(--line)', borderRadius: '11px', background: 'var(--surface)',
              color: 'var(--ink)', padding: '11px 16px', fontFamily: "'Hanken Grotesk',sans-serif",
              fontWeight: 600, fontSize: '14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            <svg width="15" height="15" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 2.5v8M5.5 7L9 10.5 12.5 7M3.5 14h11" />
            </svg>
            {t.importJson}
          </button>
          {/* New deck CTA */}
          <button
            onClick={onNewDeck}
            style={{
              border: 'none', borderRadius: '11px', background: 'var(--accent)',
              color: '#fff', padding: '11px 20px', fontFamily: "'Hanken Grotesk',sans-serif",
              fontWeight: 600, fontSize: '14px', cursor: 'pointer',
            }}
          >{t.newDeck}</button>
        </div>
      </div>

      <GroupBySelector value={group} onChange={setGroup} />
      <DeckList decks={decks} onNewDeck={onNewDeck} />
      <ImportJsonModal />
    </div>
  )
}
