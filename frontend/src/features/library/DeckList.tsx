import { DeckCard, type DeckCardProps } from './DeckCard'
export function DeckList({ decks }: { decks: DeckCardProps[] }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">{decks.map((d, i) => <DeckCard key={d.name + i} {...d} />)}</div>
}
