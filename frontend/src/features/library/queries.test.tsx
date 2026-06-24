import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useImportDeck } from './queries'
import { fakeResponse } from '../../test/fakeResponse'

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  function Wrapper({ children }: { children: ReactNode }) {
    return (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    )
  }
  Wrapper.displayName = 'ImportDeckQueryClientWrapper'
  return Wrapper
}

afterEach(() => { vi.restoreAllMocks() })

describe('useImportDeck', () => {
  it('resolves with ok=true on a successful import', async () => {
    const expected = { ok: true, msg: 'Đã nhập 5 thẻ' }
    vi.stubGlobal('fetch', vi.fn(async () => fakeResponse(expected)))
    const { result: hook } = renderHook(() => useImportDeck(), { wrapper: makeWrapper() })
    let data: unknown
    await act(async () => {
      data = await hook.current.mutateAsync({ deck: 'Test', cards: [{ word: 'w' }] })
    })
    expect(data).toEqual(expected)
    await waitFor(() => expect(hook.current.isSuccess).toBe(true))
  })

  it('resolves (not rejects) with ok=false on a server validation error', async () => {
    const expected = { ok: false, msg: 'Thiếu trường bắt buộc' }
    vi.stubGlobal('fetch', vi.fn(async () => fakeResponse(expected, 400)))
    const { result: hook } = renderHook(() => useImportDeck(), { wrapper: makeWrapper() })
    let data: unknown
    await act(async () => {
      data = await hook.current.mutateAsync({})
    })
    expect(data).toEqual(expected)
    // mutation resolved successfully — ok=false is a business-level failure, not an exception
    await waitFor(() => {
      expect(hook.current.isSuccess).toBe(true)
      expect(hook.current.isError).toBe(false)
    })
  })

  it('rejects when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    const { result: hook } = renderHook(() => useImportDeck(), { wrapper: makeWrapper() })
    await act(async () => {
      await expect(hook.current.mutateAsync({})).rejects.toBeInstanceOf(TypeError)
    })
    await waitFor(() => expect(hook.current.isError).toBe(true))
  })
})
