import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TodaySession } from './TodaySession'
import { WordOfDay } from './WordOfDay'
import { progressSummaryFixture, wordOfDayFixture } from '../../test/fixtures'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
afterEach(() => vi.restoreAllMocks())

describe('dashboard widgets (props-driven)', () => {
  it('TodaySession shows reviews_today / target from summary', () => {
    render(<TodaySession summary={progressSummaryFixture} />)
    expect(screen.getByText('/24')).toBeInTheDocument() // 8 reviewed + 16 due
  })
  it('WordOfDay renders the word', () => {
    render(<WordOfDay word={wordOfDayFixture} />)
    expect(screen.getByText('serendipity')).toBeInTheDocument()
  })
})
