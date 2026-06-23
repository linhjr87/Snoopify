import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost, API_BASE } from '../../lib/api'
import type { DeckOut, ImportResult } from '../../lib/api-types'

export function useDecks() {
  return useQuery({
    queryKey: ['decks'],
    queryFn: () => apiGet<DeckOut[]>('/decks'),
  })
}

export function useCreateDeck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; topic?: string }) => apiPost<DeckOut>('/decks', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['decks'] }),
  })
}

// /decks/import returns {ok,msg,deck?} for BOTH 200 and 400, so read the body
// on any status rather than throwing through apiPost.
export function useImportDeck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: unknown): Promise<ImportResult> => {
      const res = await fetch(`${API_BASE}/decks/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      return (await res.json()) as ImportResult
    },
    onSuccess: (result) => {
      if (result.ok) qc.invalidateQueries({ queryKey: ['decks'] })
    },
  })
}
