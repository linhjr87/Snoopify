import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReviewScreen from './ReviewScreen'
import { useAppStore, initialState } from '../../store/useAppStore'
import { renderWithProviders } from '../../test/renderWithProviders'
import { reviewSessionFixture } from '../../test/fixtures'
import { fakeResponse } from '../../test/fakeResponse'

function mockApi() {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/review/session')) return fakeResponse(reviewSessionFixture)
    if (url.includes('/review/grade')) return fakeResponse({
      card_id: 'c1', ease_factor: 2.5, interval_days: 1, repetitions: 1,
      lapses: 0, due_at: '2026-06-23T00:00:00Z', last_reviewed_at: '2026-06-22T00:00:00Z',
    })
    return fakeResponse({ detail: 'not mocked' }, 404)
  }))
}

describe('ReviewScreen', () => {
  beforeEach(() => { localStorage.clear(); useAppStore.setState({ ...initialState }); mockApi() })
  afterEach(() => { vi.restoreAllMocks() })

  it('flashcard flips to show meaning', async () => {
    renderWithProviders(<ReviewScreen />)
    expect(await screen.findByText('resilient')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Nhấn để lật thẻ'))
    expect(screen.getByText('có khả năng phục hồi nhanh; kiên cường')).toBeInTheDocument()
  })

  it('quiz shows result after a pick', async () => {
    useAppStore.setState({ reviewMode: 'quiz' })
    renderWithProviders(<ReviewScreen />)
    await screen.findByText('resilient')
    await userEvent.click(screen.getByText('có khả năng phục hồi nhanh'))
    expect(screen.getByText(/Chính xác/)).toBeInTheDocument()
  })

  it('fill check is disabled until input has value', async () => {
    useAppStore.setState({ reviewMode: 'fill' })
    renderWithProviders(<ReviewScreen />)
    await screen.findByText(/Gõ từ còn thiếu/)
    expect(screen.getByText('Kiểm tra')).toBeDisabled()
    await userEvent.type(screen.getByLabelText('fill'), 'resilient')
    expect(screen.getByText('Kiểm tra')).toBeEnabled()
  })

  it('shows session complete when index past end', async () => {
    useAppStore.setState({ sIndex: 5, sCorrect: 4 })
    renderWithProviders(<ReviewScreen />)
    expect(await screen.findByText('Hoàn thành phiên')).toBeInTheDocument()
    expect(screen.getByText(/câu đúng/)).toBeInTheDocument()
    // the correct count (4) is rendered in the SessionComplete numeral
    expect(screen.getAllByText((content) => content === '4').length).toBeGreaterThan(0)
  })

  it('shows an empty state when there are no due cards', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => fakeResponse([])))
    renderWithProviders(<ReviewScreen />)
    expect(await screen.findByText(/Không có thẻ nào đến hạn/)).toBeInTheDocument()
  })
})
