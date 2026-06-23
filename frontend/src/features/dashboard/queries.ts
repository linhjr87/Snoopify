import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../../lib/api'
import type { WordOfDayOut, CardOut } from '../../lib/api-types'

export function useWordOfDay() {
  return useQuery({
    queryKey: ['dashboard', 'word-of-day'],
    queryFn: () => apiGet<WordOfDayOut>('/dashboard/word-of-day'),
    retry: false, // 404 on an empty DB — don't retry
  })
}

export function useRecentCards(limit = 3) {
  return useQuery({
    queryKey: ['cards', 'recent', limit],
    queryFn: () => apiGet<CardOut[]>(`/cards/recent?limit=${limit}`),
  })
}
