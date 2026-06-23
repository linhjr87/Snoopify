import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LibraryScreen from './LibraryScreen'
import { initialState, useAppStore } from '../../store/useAppStore'
import type { DeckOut } from '../../lib/api-types'
import { decksFixture } from '../../test/fixtures'
import { fakeResponse } from '../../test/fakeResponse'
import { renderWithProviders } from '../../test/renderWithProviders'

const INVALID_MSG = 'JSON không hợp lệ hoặc thiếu trường bắt buộc (deck, cards[].word).'

describe('LibraryScreen', () => {
  const decksRef: { current: DeckOut[] } = { current: [] }

  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({ ...initialState })
    decksRef.current = [...decksFixture]
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.endsWith('/decks') && (!init?.method || init.method === 'GET')) {
        return fakeResponse(decksRef.current)
      }
      if (url.endsWith('/decks/import') && init?.method === 'POST') {
        const body = JSON.parse(String(init.body ?? '{}'))
        const hasCards = Array.isArray(body.cards) && body.cards.some((card: { word?: unknown }) => card?.word)
        if (!body.deck || !hasCards) {
          return fakeResponse({ ok: false, msg: INVALID_MSG }, 400)
        }
        const newDeck: DeckOut = {
          id: `d${decksRef.current.length + 1}`,
          name: String(body.deck),
          topic: String(body.topic ?? ''),
          count: body.cards.length,
          due_count: body.cards.length,
          mastery_pct: 0,
          last_reviewed_at: null,
          created_at: '2026-06-23T00:00:00Z',
          updated_at: '2026-06-23T00:00:00Z',
        }
        decksRef.current = [...decksRef.current, newDeck]
        return fakeResponse({ ok: true, msg: `Đã nhập "${newDeck.name}" · ${newDeck.count} thẻ`, deck: newDeck })
      }
      return fakeResponse({ detail: 'Not found' }, 404)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('lists API decks', async () => {
    renderWithProviders(<LibraryScreen />)

    expect(await screen.findByText('Business English')).toBeInTheDocument()
    expect(screen.getByText('Bộ thẻ khởi động')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tạo bộ thẻ mới' })).toBeInTheDocument()
  })

  it('invalid pasted JSON shows JSON không hợp lệ without needing API success', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LibraryScreen />)

    await user.click(screen.getByRole('button', { name: /Nhập.*JSON/ }))
    await user.click(screen.getByLabelText('json'))
    await user.paste('{ bad')
    await user.click(screen.getByRole('button', { name: 'Nhập' }))

    expect(screen.getByText(/JSON không hợp lệ/)).toBeInTheDocument()
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('valid import JSON adds My Deck and it appears', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LibraryScreen />)

    await screen.findByText('Business English')
    await user.click(screen.getByRole('button', { name: /Nhập.*JSON/ }))
    await user.click(screen.getByLabelText('json'))
    await user.paste(JSON.stringify({ deck: 'My Deck', cards: [{ word: 'x' }] }))
    await user.click(screen.getByRole('button', { name: 'Nhập' }))

    await waitFor(() => expect(screen.getByText('My Deck')).toBeInTheDocument())
  })
})
