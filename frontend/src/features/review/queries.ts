import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../lib/api'
import type { ReviewItemOut, GradeRequest, GradeResult } from '../../lib/api-types'
import { toSessionItem, type SessionCard } from '../../lib/adapters'
import { useAppStore } from '../../store/useAppStore'

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
      useAppStore.getState().setGradeError(false)
      qc.invalidateQueries({ queryKey: ['progress'] })
      qc.invalidateQueries({ queryKey: ['decks'] })
      // Do NOT invalidate ['review'] here — that would refetch the active session
      // mid-card and reset the cursor. Session invalidation is handled by
      // SessionComplete.reviewAgain when the user explicitly starts a new session.
    },
    // The session keeps advancing optimistically; surface the failure (non-blocking)
    // so the user knows their last grade did not persist server-side.
    onError: () => useAppStore.getState().setGradeError(true),
  })
}
