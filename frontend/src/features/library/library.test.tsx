import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LibraryScreen from './LibraryScreen'
import { decksFixture } from '../../test/fixtures'

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock, refresh: vi.fn() }) }))
afterEach(() => vi.restoreAllMocks())

describe('LibraryScreen (props-driven)', () => {
  it('renders deck names and the total counts from props', () => {
    render(<LibraryScreen decks={decksFixture} />)
    expect(screen.getByText(decksFixture[0].name)).toBeInTheDocument()
    const totalCards = decksFixture.reduce((s, d) => s + d.count, 0)
    expect(screen.getByText(new RegExp(`${totalCards} thẻ`))).toBeInTheDocument()
  })

  it('navigates to /add when "+ New deck" is clicked', async () => {
    render(<LibraryScreen decks={[]} />)
    // button text is locale-driven; match the header CTA (t.newDeck) which starts with '+'
    await userEvent.click(screen.getByText(/^\+ Bộ thẻ mới$|^\+ New deck$/i))
    expect(pushMock).toHaveBeenCalledWith('/add')
  })
})
