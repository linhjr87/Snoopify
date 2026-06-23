import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiGet, apiPost } from '../../lib/api'
import type { ProgressSummary, HeatmapOut, NeedsReviewItem } from '../../lib/api-types'

export function useProgressSummary() {
  return useQuery({ queryKey: ['progress', 'summary'], queryFn: () => apiGet<ProgressSummary>('/progress/summary') })
}

export function useHeatmap() {
  return useQuery({ queryKey: ['progress', 'heatmap'], queryFn: () => apiGet<HeatmapOut>('/progress/heatmap') })
}

export function useNeedsReview() {
  return useQuery({ queryKey: ['progress', 'needs-review'], queryFn: () => apiGet<NeedsReviewItem[]>('/progress/needs-review') })
}

export function useResetProgress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiPost<{ reset: number }>('/progress/reset'),
    onSuccess: () => {
      for (const key of [['progress'], ['decks'], ['review'], ['cards'], ['dashboard']]) {
        qc.invalidateQueries({ queryKey: key })
      }
    },
  })
}
