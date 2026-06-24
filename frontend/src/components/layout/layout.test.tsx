import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AppShell } from '../AppShell'
import { useAppStore, initialState } from '../../store/useAppStore'
import { progressSummaryFixture, wordOfDayFixture, recentCardsFixture } from '../../test/fixtures'
import { fakeResponse } from '../../test/fakeResponse'

const pushMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
}))

function renderShell() {
  return render(
    <AppShell>
      <section>Page body</section>
    </AppShell>,
  )
}

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
  beforeEach(() => {
    localStorage.clear()
    pushMock.mockReset()
    // Skip the onboarding tour auto-start so it doesn't interfere with assertions.
    localStorage.setItem('myenglish_tour_done', '1')
    // Routes are auth-gated now; the AppShell only renders when authenticated.
    useAppStore.setState({ ...initialState, isAuthenticated: true, _hasHydrated: true })
    mockApi()
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('shows Snoopify brand', () => {
    renderShell()
    expect(screen.getByText('Snoopify')).toBeInTheDocument()
  })
  it('settings trigger opens panel with logout action', async () => {
    renderShell()
    await userEvent.click(screen.getByLabelText('Cài đặt'))
    expect(screen.getByText('Đăng xuất')).toBeInTheDocument()
  })
  it('reset requires confirm step', async () => {
    useAppStore.setState({ settingsOpen: true })
    renderShell()
    await userEvent.click(screen.getByText('Đặt lại tiến độ'))
    expect(screen.getByText('Xoá hết')).toBeInTheDocument()
  })
  it('confirming reset POSTs /progress/reset', async () => {
    useAppStore.setState({ settingsOpen: true, confirmReset: true })
    renderShell()
    await userEvent.click(screen.getByText('Xoá hết'))
    await vi.waitFor(() => {
      const calls = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls
      const posted = calls.some((c) =>
        String(c[0]).includes('/progress/reset') && ((c[1] as RequestInit | undefined)?.method ?? 'GET') === 'POST')
      expect(posted).toBe(true)
    })
  })
  it('failed reset surfaces an error and keeps progress', async () => {
    useAppStore.setState({ settingsOpen: true, confirmReset: true })
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/progress/reset')) return fakeResponse({ detail: 'boom' }, 500)
      if (url.includes('/progress/summary')) return fakeResponse(progressSummaryFixture)
      if (url.includes('/dashboard/word-of-day')) return fakeResponse(wordOfDayFixture)
      if (url.includes('/cards/recent')) return fakeResponse(recentCardsFixture)
      return fakeResponse([], 200)
    }))
    renderShell()
    await userEvent.click(screen.getByText('Xoá hết'))
    expect(await screen.findByText('Không xoá được tiến độ. Thử lại sau.')).toBeInTheDocument()
    // resetProgress() must NOT have run, so the panel stays open
    expect(useAppStore.getState().settingsOpen).toBe(true)
  })
})
