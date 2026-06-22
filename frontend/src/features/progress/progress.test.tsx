import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ProgressScreen from './ProgressScreen'
import { useAppStore, initialState } from '../../store/useAppStore'

function Harness() {
  return (
    <MemoryRouter initialEntries={['/progress']}>
      <Routes>
        <Route path="/progress" element={<ProgressScreen />} />
        <Route path="/review" element={<div>REVIEW PAGE</div>} />
      </Routes>
    </MemoryRouter>
  )
}
describe('ProgressScreen', () => {
  beforeEach(() => { localStorage.clear(); useAppStore.setState({ ...initialState }) })
  it('renders stat tiles', () => { render(<Harness />); expect(screen.getByText('486')).toBeInTheDocument() })
  it('needs-review CTA navigates to review', async () => {
    render(<Harness />)
    await userEvent.click(screen.getByText('Ôn ngay nhóm này'))
    expect(screen.getByText('REVIEW PAGE')).toBeInTheDocument()
  })
})
