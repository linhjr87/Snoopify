import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AddScreen from './AddScreen'
import { useAppStore, initialState } from '../../store/useAppStore'
import { renderWithProviders } from '../../test/renderWithProviders'
import { decksFixture } from '../../test/fixtures'
import { fakeResponse } from '../../test/fakeResponse'

function mockApi() {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = (init?.method ?? 'GET').toUpperCase()
    if (/\/decks\/[^/]+\/cards$/.test(url) && method === 'POST') {
      return fakeResponse({
        id: 'c1', deck_id: 'd1', word: 'x', phonetic: '', pos: '', meaning: '', example: '',
        ease_factor: 2.5, interval_days: 0, repetitions: 0, lapses: 0,
        due_at: '2026-06-23T00:00:00Z', last_reviewed_at: null,
        created_at: '2026-06-23T00:00:00Z', updated_at: '2026-06-23T00:00:00Z',
      }, 201)
    }
    if (url.includes('/decks') && method === 'GET') return fakeResponse(decksFixture)
    return fakeResponse({ detail: 'not mocked' }, 404)
  }))
}

describe('AddScreen', () => {
  beforeEach(() => { localStorage.clear(); useAppStore.setState({ ...initialState }); mockApi() })
  afterEach(() => { vi.restoreAllMocks() })

  it('typing updates the live preview', async () => {
    renderWithProviders(<AddScreen />)
    await userEvent.type(screen.getByLabelText('word'), 'ubiquitous')
    expect(screen.getByText('ubiquitous')).toBeInTheDocument()
  })

  it('saving posts a card to the selected deck', async () => {
    renderWithProviders(<AddScreen />)
    // deck dropdown defaults to the first loaded deck (d1)
    await screen.findByRole('option', { name: 'Bộ thẻ khởi động' })
    await userEvent.type(screen.getByLabelText('word'), 'ephemeral')
    await userEvent.click(screen.getByRole('button', { name: 'Lưu thẻ' }))
    await waitFor(() => {
      const calls = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls
      const posted = calls.some((c) =>
        /\/decks\/d1\/cards$/.test(String(c[0])) && ((c[1] as RequestInit | undefined)?.method ?? 'GET') === 'POST')
      expect(posted).toBe(true)
    })
  })
})
