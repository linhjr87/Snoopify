import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import DashboardScreen from './DashboardScreen'
import { useAppStore, initialState } from '../../store/useAppStore'

function Harness() {
  return (
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<DashboardScreen />} />
        <Route path="/review" element={<div>REVIEW PAGE</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('DashboardScreen', () => {
  beforeEach(() => { localStorage.clear(); useAppStore.setState({ ...initialState }) })
  it('renders today session and word of day', () => {
    render(<Harness />)
    // "8" and "/24" are in separate styled spans to match the export's ring layout
    expect(screen.getByText('8', { selector: 'div' })).toBeInTheDocument()
    expect(screen.getByText('/24')).toBeInTheDocument()
    expect(screen.getByText('serendipity')).toBeInTheDocument()
  })
  it('start review navigates to /review', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByText('Bắt đầu ôn tập'))
    expect(screen.getByText('REVIEW PAGE')).toBeInTheDocument()
  })
})
