import { useMemo, useState } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import { Button } from '../../components/ui/Button'
import { DeckList } from './DeckList'
import { GroupBySelector, type GroupBy } from './GroupBySelector'
import { ImportJsonModal } from './ImportJsonModal'
import { seedDecks } from '../../data/seed'
import type { DeckCardProps } from './DeckCard'
export default function LibraryScreen() {
  const t = useT()
  const imported = useAppStore((s) => s.importedDecks)
  const setPanel = useAppStore((s) => s.setPanel)
  const [group, setGroup] = useState<GroupBy>('topic')
  const decks: DeckCardProps[] = useMemo(() => {
    const importedVM = imported.map((d) => ({ name: d.name, tag: d.topic || 'đã nhập', meta: `${d.count} thẻ · chưa ôn`, mastery: 'mới · chưa ôn', last: 'vừa nhập', barW: '0%', needAttention: false }))
    const all = [...seedDecks, ...importedVM]
    if (group === 'mastery') return [...all].sort((a, b) => parseInt(b.barW) - parseInt(a.barW))
    return all
  }, [imported, group])
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-ink">{t.libraryTitle}</h1>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setPanel('importOpen', true)}>{t.importJson}</Button>
          <Button>{t.newDeck}</Button>
        </div>
      </div>
      <GroupBySelector value={group} onChange={setGroup} />
      <DeckList decks={decks} />
      <ImportJsonModal />
    </div>
  )
}
