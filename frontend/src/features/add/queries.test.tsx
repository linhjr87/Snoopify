import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useAddCard } from './queries'
import { fakeResponse } from '../../test/fakeResponse'

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}

afterEach(() => { vi.restoreAllMocks() })

describe('useAddCard', () => {
  it('POSTs the card to /decks/{deckId}/cards', async () => {
    const spy = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      fakeResponse({
        id: 'card1', deck_id: 'd1', word: 'x', phonetic: '', pos: '', meaning: '', example: '',
        ease_factor: 2.5, interval_days: 0, repetitions: 0, lapses: 0,
        due_at: '2026-06-23T00:00:00Z', last_reviewed_at: null,
        created_at: '2026-06-23T00:00:00Z', updated_at: '2026-06-23T00:00:00Z',
      }, 201))
    vi.stubGlobal('fetch', spy)
    const { result } = renderHook(() => useAddCard(), { wrapper: makeWrapper() })
    await result.current.mutateAsync({ deckId: 'd1', card: { word: 'x' } })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(String(spy.mock.calls[0][0])).toContain('/decks/d1/cards')
    expect((spy.mock.calls[0][1] as RequestInit).method).toBe('POST')
  })
})
