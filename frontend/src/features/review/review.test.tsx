import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ReviewScreen from './ReviewScreen'
import { useAppStore, initialState } from '../../store/useAppStore'
import { renderWithProviders } from '../../test/renderWithProviders'
import { reviewSessionFixture } from '../../test/fixtures'
import { fakeResponse } from '../../test/fakeResponse'

const gradeResult = {
  card_id: 'c1', ease_factor: 2.5, interval_days: 1, repetitions: 1,
  lapses: 0, due_at: '2026-06-23T00:00:00Z', last_reviewed_at: '2026-06-22T00:00:00Z',
}

let sessionFetches = 0

function mockApi({ gradeOk = true }: { gradeOk?: boolean } = {}) {
  sessionFetches = 0
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/review/session')) { sessionFetches++; return fakeResponse(reviewSessionFixture) }
    if (url.includes('/review/grade')) {
      return gradeOk ? fakeResponse(gradeResult) : fakeResponse({ detail: 'boom' }, 500)
    }
    return fakeResponse({ detail: 'not mocked' }, 404)
  }))
}

function advanceToEnd(correctCount = reviewSessionFixture.length) {
  act(() => {
    const s = useAppStore.getState()
    for (let i = 0; i < reviewSessionFixture.length; i++) s.advanceSession(i < correctCount)
  })
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

  // Issue 1: a leftover cursor (persisted, or from a previous in-app session) must
  // not point into a freshly-loaded session. Before the fix this rendered an instant
  // "session complete" the user could never escape.
  it('resets a stale session cursor when the session loads', async () => {
    useAppStore.setState({ sIndex: 5, sCorrect: 4 })
    renderWithProviders(<ReviewScreen />)
    expect(await screen.findByText('resilient')).toBeInTheDocument()
    expect(screen.queryByText('Hoàn thành phiên')).not.toBeInTheDocument()
    expect(useAppStore.getState().sIndex).toBe(0)
    expect(useAppStore.getState().sCorrect).toBe(0)
  })

  it('shows session complete with the score after finishing the session', async () => {
    renderWithProviders(<ReviewScreen />)
    await screen.findByText('resilient') // session loaded → cursor reset to 0
    advanceToEnd(4)
    expect(await screen.findByText('Hoàn thành phiên')).toBeInTheDocument()
    expect(screen.getByText(/câu đúng/)).toBeInTheDocument()
    expect(screen.getAllByText((content) => content === '4').length).toBeGreaterThan(0)
  })

  // Issue 3: "Học lại" must fetch the current due cards, not replay the cached
  // (already-graded) ones.
  it('refetches the session when the user reviews again', async () => {
    renderWithProviders(<ReviewScreen />)
    await screen.findByText('resilient')
    expect(sessionFetches).toBe(1)
    advanceToEnd()
    await userEvent.click(await screen.findByText('Học lại'))
    await waitFor(() => expect(sessionFetches).toBe(2))
  })

  // Issue 2: a failed grade POST must surface (non-blocking) instead of being swallowed.
  it('shows a non-blocking warning when a grade fails to save', async () => {
    mockApi({ gradeOk: false })
    renderWithProviders(<ReviewScreen />)
    await screen.findByText('resilient')
    await userEvent.click(screen.getByText('Nhớ')) // flashcard rating → grade + advance
    expect(await screen.findByText(/Chưa lưu được kết quả/)).toBeInTheDocument()
  })

  it('shows an empty state when there are no due cards', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => fakeResponse([])))
    renderWithProviders(<ReviewScreen />)
    expect(await screen.findByText(/Không có thẻ nào đến hạn/)).toBeInTheDocument()
  })
})
