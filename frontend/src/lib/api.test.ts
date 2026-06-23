import { describe, it, expect, vi, afterEach } from 'vitest'
import { apiGet, apiPost, ApiError } from './api'
import { fakeResponse } from '../test/fakeResponse'

afterEach(() => { vi.restoreAllMocks() })

describe('api client', () => {
  it('apiGet returns parsed JSON on 200', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => fakeResponse({ hello: 'world' }, 200)))
    const data = await apiGet<{ hello: string }>('/thing')
    expect(data).toEqual({ hello: 'world' })
  })

  it('apiPost sends a JSON body with method POST', async () => {
    const spy = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => fakeResponse({ ok: true }, 200))
    vi.stubGlobal('fetch', spy)
    await apiPost('/grade', { a: 1 })
    const init = spy.mock.calls[0][1] as RequestInit
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify({ a: 1 }))
  })

  it('throws ApiError carrying status + detail on non-OK', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => fakeResponse({ detail: 'nope' }, 400)))
    await expect(apiGet('/x')).rejects.toMatchObject({ status: 400, detail: 'nope' })
    await expect(apiGet('/x')).rejects.toBeInstanceOf(ApiError)
  })
})
