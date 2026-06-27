import { apiFetch, orRedirect } from '../../lib/api-server'
import type { DeckOut } from '../../lib/api-types'
import AddScreen from '../../features/add/AddScreen'

export default async function AddPage() {
  const decks = await apiFetch<DeckOut[]>('/decks').catch(orRedirect([] as DeckOut[]))
  return <AddScreen decks={decks} />
}
