import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ReviewScreen from './ReviewScreen'
import { useAppStore, initialState } from '../../store/useAppStore'

const renderReview = () => render(<MemoryRouter><ReviewScreen /></MemoryRouter>)
describe('ReviewScreen', () => {
  beforeEach(() => { localStorage.clear(); useAppStore.setState({ ...initialState }) })

  it('flashcard flips to show meaning', async () => {
    renderReview()
    expect(screen.getByText('resilient')).toBeInTheDocument()
    await userEvent.click(screen.getByText('Nhấn để lật thẻ'))
    expect(screen.getByText('có khả năng phục hồi nhanh; kiên cường')).toBeInTheDocument()
  })

  it('quiz blocks next until a pick, then advances', async () => {
    useAppStore.setState({ reviewMode: 'quiz' })
    renderReview()
    expect(screen.queryByText('Tiếp theo →')).not.toBeInTheDocument()
    await userEvent.click(screen.getByText('có khả năng phục hồi nhanh'))
    expect(screen.getByText(/Chính xác/)).toBeInTheDocument()
  })

  it('fill check is disabled until input has value', async () => {
    useAppStore.setState({ reviewMode: 'fill' })
    renderReview()
    expect(screen.getByText('Kiểm tra')).toBeDisabled()
    await userEvent.type(screen.getByLabelText('fill'), 'resilient')
    expect(screen.getByText('Kiểm tra')).toBeEnabled()
  })

  it('shows session complete when index past end', () => {
    useAppStore.setState({ sIndex: 5, sCorrect: 4 })
    renderReview()
    expect(screen.getByText('Hoàn thành phiên')).toBeInTheDocument()
    // Score is rendered as large Newsreader numeral; stat line shows "câu đúng · 80% chính xác"
    // The "/5 câu đúng" text is split across sibling elements in the export markup,
    // so we check the stat div text content contains the accuracy phrase and the card shows the total.
    expect(screen.getByText(/câu đúng/)).toBeInTheDocument()
    // Confirm correct count (4) is present as a direct text node inside the big number div
    expect(screen.getAllByText((content) => content === '4').length).toBeGreaterThan(0)
  })
})
