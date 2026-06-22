import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../lib/api'
import type { ReviewItemOut, GradeRequest, GradeResult } from '../../lib/api-types'
import { toSessionItem, type SessionCard } from '../../lib/adapters'

export function useSession(deckId?: string, limit = 20) {
  return useQuery({
    queryKey: ['review', 'session', deckId ?? null, limit],
    queryFn: async (): Promise<SessionCard[]> => {
      const qs = new URLSearchParams()
      if (deckId) qs.set('deck_id', deckId)
      qs.set('limit', String(limit))
      const items = await apiGet<ReviewItemOut[]>(`/review/session?${qs.toString()}`)
      return items.map(toSessionItem)
    },
  })
}

export function useGradeMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (req: GradeRequest) => apiPost<GradeResult>('/review/grade', req),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['progress'] })
      qc.invalidateQueries({ queryKey: ['decks'] })
    },
  })
}
