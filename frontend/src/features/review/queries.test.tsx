import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useSession, useGradeMutation } from './queries'
import { fakeResponse } from '../../test/fakeResponse'

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

afterEach(() => { vi.restoreAllMocks() })

describe('useSession', () => {
  it('fetches /review/session and adapts the items', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => fakeResponse([{
      card_id: 'c1', word: 'w', phonetic: '/p/', pos: 'noun', meaning: 'm', example: 'e',
      quiz: { options: [
        { key: 'A', text: 'a' }, { key: 'B', text: 'b' },
        { key: 'C', text: 'c' }, { key: 'D', text: 'd' }], correct_key: 'A' },
      fill: { before: 'b', after: 'a', answer: 'w', hint: 'w' },
    }])))
    const { result } = renderHook(() => useSession(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.[0].cardId).toBe('c1')
    expect(result.current.data?.[0].phon).toBe('/p/ · noun')
  })
})

describe('useGradeMutation', () => {
  it('POSTs the grade to /review/grade', async () => {
    const spy = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => fakeResponse({
      card_id: 'c1', ease_factor: 2.5, interval_days: 1, repetitions: 1,
      lapses: 0, due_at: '2026-06-23T00:00:00Z', last_reviewed_at: '2026-06-22T00:00:00Z',
    }))
    vi.stubGlobal('fetch', spy)
    const { result } = renderHook(() => useGradeMutation(), { wrapper: makeWrapper() })
    await result.current.mutateAsync({ card_id: 'c1', rating: 'remember', mode: 'flash', is_correct: null })
    expect(String(spy.mock.calls[0][0])).toContain('/review/grade')
    expect((spy.mock.calls[0][1] as RequestInit).method).toBe('POST')
  })

  it('invalidates progress and decks on success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => fakeResponse({
      card_id: 'c1', ease_factor: 2.5, interval_days: 1, repetitions: 1,
      lapses: 0, due_at: '2026-06-23T00:00:00Z', last_reviewed_at: '2026-06-22T00:00:00Z',
    })))
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const spy = vi.spyOn(qc, 'invalidateQueries')
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    )
    const { result } = renderHook(() => useGradeMutation(), { wrapper })
    await result.current.mutateAsync({ card_id: 'c1', rating: 'remember', mode: 'flash', is_correct: null })
    expect(spy).toHaveBeenCalledWith({ queryKey: ['progress'] })
    expect(spy).toHaveBeenCalledWith({ queryKey: ['decks'] })
  })
})
