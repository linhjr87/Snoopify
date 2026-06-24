import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ReviewScreen from './ReviewScreen'
import { reviewSessionFixture } from '../../test/fixtures'
import { toSessionItem } from '../../lib/adapters'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
afterEach(() => vi.restoreAllMocks())

describe('ReviewScreen (props-driven)', () => {
  it('shows the empty-state message when the session has no cards', () => {
    render(<ReviewScreen session={[]} />)
    expect(screen.getByText(/Không có thẻ nào đến hạn/)).toBeInTheDocument()
  })
  it('renders the card count for a non-empty session', () => {
    const session = reviewSessionFixture.map(toSessionItem)
    render(<ReviewScreen session={session} />)
    expect(screen.getByText(new RegExp(`/ ${session.length}`))).toBeInTheDocument()
  })
})
