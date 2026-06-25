import { apiFetch } from '../../lib/api-server'
import type { DeckOut } from '../../lib/api-types'
import LibraryScreen from '../../features/library/LibraryScreen'

export default async function LibraryPage() {
  const decks = await apiFetch<DeckOut[]>('/decks').catch(() => [] as DeckOut[])
  return <LibraryScreen decks={decks} />
}
