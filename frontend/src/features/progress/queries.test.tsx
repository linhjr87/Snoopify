import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useProgressSummary, useResetProgress } from './queries'
import { progressSummaryFixture } from '../../test/fixtures'
import { fakeResponse } from '../../test/fakeResponse'

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )
}
afterEach(() => { vi.restoreAllMocks() })

describe('progress queries', () => {
  it('useProgressSummary fetches /progress/summary', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => fakeResponse(progressSummaryFixture)))
    const { result } = renderHook(() => useProgressSummary(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.streak).toBe(12)
  })

  it('useResetProgress POSTs /progress/reset', async () => {
    const spy = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => fakeResponse({ reset: 5 }))
    vi.stubGlobal('fetch', spy)
    const { result } = renderHook(() => useResetProgress(), { wrapper: makeWrapper() })
    await result.current.mutateAsync()
    expect(String(spy.mock.calls[0][0])).toContain('/progress/reset')
    expect((spy.mock.calls[0][1] as RequestInit).method).toBe('POST')
  })
})
