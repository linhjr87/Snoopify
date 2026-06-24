import { describe, it, expect, vi, afterEach } from 'vitest'
import { apiGet, apiPost, apiPatch, apiDelete, ApiError, apiFetch } from './api'
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

  it('apiPatch sends a JSON body with method PATCH', async () => {
    const spy = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => fakeResponse({ patched: true }, 200))
    vi.stubGlobal('fetch', spy)
    await apiPatch('/item/1', { name: 'updated' })
    const init = spy.mock.calls[0]?.[1] as unknown as RequestInit
    expect(init.method).toBe('PATCH')
    expect(init.body).toBe(JSON.stringify({ name: 'updated' }))
  })

  it('apiDelete sends DELETE with no body', async () => {
    const spy = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => fakeResponse({}, 200))
    vi.stubGlobal('fetch', spy)
    await apiDelete('/item/1')
    const init = spy.mock.calls[0]?.[1] as unknown as RequestInit
    expect(init.method).toBe('DELETE')
    expect(init.body).toBeUndefined()
  })

  it('returns undefined for 204 No Content without calling res.json()', async () => {
    const jsonSpy = vi.fn()
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 204, statusText: 'No Content', json: jsonSpy,
    } as unknown as Response)))
    const result = await apiDelete<void>('/item/1')
    expect(result).toBeUndefined()
    expect(jsonSpy).not.toHaveBeenCalled()
  })

  it('throws ApiError carrying status + detail on non-OK', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => fakeResponse({ detail: 'nope' }, 400)))
    await expect(apiGet('/x')).rejects.toMatchObject({ status: 400, detail: 'nope' })
    await expect(apiGet('/x')).rejects.toBeInstanceOf(ApiError)
  })

  it('throws ApiError when success response body is not valid JSON', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, status: 200, statusText: 'OK',
      json: async () => { throw new SyntaxError('bad json') },
    } as unknown as Response)))
    await expect(apiGet('/x')).rejects.toBeInstanceOf(ApiError)
  })

  it('apiFetch hits BACKEND_URL directly and returns JSON', async () => {
    const spy = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => fakeResponse({ ok: 1 }, 200))
    vi.stubGlobal('fetch', spy)
    const data = await apiFetch<{ ok: number }>('/review/session')
    expect(data).toEqual({ ok: 1 })
    expect(String(spy.mock.calls[0][0])).toContain('/review/session')
    expect(String(spy.mock.calls[0][0])).not.toContain('/api/')
  })
})
