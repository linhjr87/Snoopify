import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AddCardForm } from './AddCardForm'
import { decksFixture } from '../../test/fixtures'
import * as api from '../../lib/api'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
afterEach(() => vi.restoreAllMocks())

describe('AddCardForm (props-driven)', () => {
  it('saves a card via apiPost to the selected deck', async () => {
    const spy = vi.spyOn(api, 'apiPost').mockResolvedValue({} as never)
    render(<AddCardForm decks={decksFixture} />)
    // The word field uses aria-label="word"; the save button text is "Lưu thẻ".
    fireEvent.change(screen.getByLabelText('word'), { target: { value: 'serendipity' } })
    fireEvent.click(screen.getByText('Lưu thẻ'))
    await vi.waitFor(() =>
      expect(spy).toHaveBeenCalledWith(
        `/decks/${decksFixture[0].id}/cards`,
        expect.objectContaining({ word: 'serendipity' }),
      )
    )
  })
})
