import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import DashboardScreen from './DashboardScreen'
import { useAppStore, initialState } from '../../store/useAppStore'
import { renderWithProviders } from '../../test/renderWithProviders'
import { progressSummaryFixture, wordOfDayFixture, recentCardsFixture } from '../../test/fixtures'
import { fakeResponse } from '../../test/fakeResponse'

function mockApi() {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/progress/summary')) return fakeResponse(progressSummaryFixture)
    if (url.includes('/dashboard/word-of-day')) return fakeResponse(wordOfDayFixture)
    if (url.includes('/cards/recent')) return fakeResponse(recentCardsFixture)
    return fakeResponse({ detail: 'not mocked' }, 404)
  }))
}

function renderDashboard() {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<DashboardScreen />} />
      <Route path="/review" element={<div>REVIEW PAGE</div>} />
    </Routes>,
  )
}

describe('DashboardScreen', () => {
  beforeEach(() => { localStorage.clear(); useAppStore.setState({ ...initialState }); mockApi() })
  afterEach(() => { vi.restoreAllMocks() })

  it('renders the word of day and due count from the API', async () => {
    renderDashboard()
    expect(await screen.findByText('serendipity')).toBeInTheDocument()
    expect(screen.getByText('/24')).toBeInTheDocument() // ring: reviews_today 8 / (8 + due 16)
  })

  it('start review navigates to /review', async () => {
    renderDashboard()
    await userEvent.click(await screen.findByText('Bắt đầu ôn tập'))
    expect(screen.getByText('REVIEW PAGE')).toBeInTheDocument()
  })
})
