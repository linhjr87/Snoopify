import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from '../../App'
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
    return fakeResponse([], 200)
  }))
}

describe('layout', () => {
  beforeEach(() => { localStorage.clear(); useAppStore.setState({ ...initialState }); mockApi() })
  afterEach(() => { vi.restoreAllMocks() })

  it('shows Snoopify brand', () => {
    renderWithProviders(<App />)
    expect(screen.getByText('Snoopify')).toBeInTheDocument()
  })
  it('settings trigger opens panel with dark toggle', async () => {
    renderWithProviders(<App />)
    await userEvent.click(screen.getByLabelText('Cài đặt'))
    expect(screen.getByText('Chế độ tối')).toBeInTheDocument()
  })
  it('reset requires confirm step', async () => {
    useAppStore.setState({ settingsOpen: true })
    renderWithProviders(<App />)
    await userEvent.click(screen.getByText('Đặt lại tiến độ'))
    expect(screen.getByText('Xoá hết')).toBeInTheDocument()
  })
})
