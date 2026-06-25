import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Sidebar } from './Sidebar'
import { useAppStore, initialState } from '../../store/useAppStore'
import { progressSummaryFixture, decksFixture } from '../../test/fixtures'
import type { DeckOut } from '../../lib/api-types'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  usePathname: () => '/',
}))

const manyDecksFixture: DeckOut[] = [
  { id: 'a', name: 'Alpha', topic: 't', count: 1, due_count: 0, mastery_pct: 0, last_reviewed_at: '2026-06-10T00:00:00Z', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-06-10T00:00:00Z' },
  { id: 'b', name: 'Bravo', topic: 't', count: 1, due_count: 0, mastery_pct: 0, last_reviewed_at: '2026-06-20T00:00:00Z', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-06-20T00:00:00Z' },
  { id: 'c', name: 'Charlie', topic: 't', count: 1, due_count: 0, mastery_pct: 0, last_reviewed_at: null, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'd', name: 'Delta', topic: 't', count: 1, due_count: 0, mastery_pct: 0, last_reviewed_at: '2026-06-25T00:00:00Z', created_at: '2026-01-01T00:00:00Z', updated_at: '2026-06-25T00:00:00Z' },
]

describe('Sidebar', () => {
  beforeEach(() => {
    localStorage.clear()
    pushMock.mockReset()
    useAppStore.setState({ ...initialState })
  })

  it('renders the real streak count from the summary prop', () => {
    render(<Sidebar summary={{ ...progressSummaryFixture, streak: 7 }} />)
    expect(screen.getByText('streak 7 ngày')).toBeInTheDocument()
  })

  it('falls back to a 0-day streak when summary is null', () => {
    render(<Sidebar summary={null} />)
    expect(screen.getByText('streak 0 ngày')).toBeInTheDocument()
  })

  it('renders up to 3 decks, most recently reviewed first', () => {
    render(<Sidebar decks={manyDecksFixture} />)
    const names = screen.getAllByText(/^(Alpha|Bravo|Charlie|Delta)$/).map((el) => el.textContent)
    expect(names).toEqual(['Delta', 'Bravo', 'Alpha'])
  })

  it('shows a "view all" link only when there are more than 3 decks, and it navigates to /library', async () => {
    render(<Sidebar decks={manyDecksFixture} />)
    const viewAll = screen.getByText('Xem tất cả →')
    expect(viewAll).toBeInTheDocument()
    await userEvent.click(viewAll)
    expect(pushMock).toHaveBeenCalledWith('/library')
  })

  it('hides the "view all" link when there are 3 or fewer decks', () => {
    render(<Sidebar decks={decksFixture} />)
    expect(screen.queryByText('Xem tất cả →')).not.toBeInTheDocument()
  })

  it('shows an empty state when there are no decks, without losing the tour anchor', () => {
    render(<Sidebar decks={[]} />)
    expect(screen.getByText('(chưa có bộ thẻ)')).toBeInTheDocument()
    // The "mistakes" row always renders, so [data-tour="decks"] never collapses
    // to zero height even with an empty deck list (regression guard for the
    // guided-tour rect bug fixed in 08280fe).
    expect(screen.getByText('Lỗi của tôi')).toBeInTheDocument()
  })

  it('navigates to /library when a deck row is clicked', async () => {
    render(<Sidebar decks={decksFixture} />)
    await userEvent.click(screen.getByText('Business English'))
    expect(pushMock).toHaveBeenCalledWith('/library')
  })

  it('navigates to /progress when the "my mistakes" row is clicked', async () => {
    render(<Sidebar />)
    await userEvent.click(screen.getByText('Lỗi của tôi'))
    expect(pushMock).toHaveBeenCalledWith('/progress')
  })
})
