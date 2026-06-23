import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Routes, Route } from 'react-router-dom'
import ProgressScreen from './ProgressScreen'
import { useAppStore, initialState } from '../../store/useAppStore'
import { renderWithProviders } from '../../test/renderWithProviders'
import { progressSummaryFixture, heatmapFixture, needsReviewFixture } from '../../test/fixtures'
import { fakeResponse } from '../../test/fakeResponse'

function mockApi() {
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/progress/summary')) return fakeResponse(progressSummaryFixture)
    if (url.includes('/progress/heatmap')) return fakeResponse(heatmapFixture)
    if (url.includes('/progress/needs-review')) return fakeResponse(needsReviewFixture)
    return fakeResponse({ detail: 'not mocked' }, 404)
  }))
}

function renderProgress() {
  return renderWithProviders(
    <Routes>
      <Route path="/" element={<ProgressScreen />} />
      <Route path="/review" element={<div>REVIEW PAGE</div>} />
    </Routes>,
  )
}

describe('ProgressScreen', () => {
  beforeEach(() => { localStorage.clear(); useAppStore.setState({ ...initialState }); mockApi() })
  afterEach(() => { vi.restoreAllMocks() })

  it('renders the streak stat tile from the API', async () => {
    renderProgress()
    expect(await screen.findByText('12')).toBeInTheDocument()
    expect(screen.getByText('ngày liên tục')).toBeInTheDocument()
  })

  it('needs-review CTA navigates to review', async () => {
    renderProgress()
    await userEvent.click(await screen.findByText('Ôn ngay nhóm này'))
    expect(screen.getByText('REVIEW PAGE')).toBeInTheDocument()
  })
})
