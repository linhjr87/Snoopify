import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Sidebar } from './Sidebar'
import { useAppStore, initialState } from '../../store/useAppStore'
import { progressSummaryFixture } from '../../test/fixtures'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  usePathname: () => '/',
}))

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
})
