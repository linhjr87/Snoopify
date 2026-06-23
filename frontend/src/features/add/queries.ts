import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiPost } from '../../lib/api'
import type { CardCreate, CardOut } from '../../lib/api-types'

export function useAddCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ deckId, card }: { deckId: string; card: CardCreate }) =>
      apiPost<CardOut>(`/decks/${deckId}/cards`, card),
    onSuccess: (_result, vars) => {
      qc.invalidateQueries({ queryKey: ['decks'] })
      qc.invalidateQueries({ queryKey: ['decks', vars.deckId] })
    },
  })
}
