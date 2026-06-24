import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import LibraryScreen from './LibraryScreen'
import { decksFixture } from '../../test/fixtures'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
afterEach(() => vi.restoreAllMocks())

describe('LibraryScreen (props-driven)', () => {
  it('renders deck names and the total counts from props', () => {
    render(<LibraryScreen decks={decksFixture} />)
    expect(screen.getByText(decksFixture[0].name)).toBeInTheDocument()
    const totalCards = decksFixture.reduce((s, d) => s + d.count, 0)
    expect(screen.getByText(new RegExp(`${totalCards} thẻ`))).toBeInTheDocument()
  })
})
