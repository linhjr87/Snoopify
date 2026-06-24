import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProgressScreen from './ProgressScreen'
import { progressSummaryFixture, heatmapFixture, needsReviewFixture } from '../../test/fixtures'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
afterEach(() => vi.restoreAllMocks())

describe('ProgressScreen (props-driven)', () => {
  it('renders the streak stat tile from the summary prop', () => {
    render(<ProgressScreen summary={progressSummaryFixture} heatmap={heatmapFixture} needsReview={needsReviewFixture} />)
    expect(screen.getByText(String(progressSummaryFixture.streak))).toBeInTheDocument()
    expect(screen.getByText('ngày liên tục')).toBeInTheDocument()
  })
})
