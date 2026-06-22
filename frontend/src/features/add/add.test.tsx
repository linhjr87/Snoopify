import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AddScreen from './AddScreen'
import { useAppStore, initialState } from '../../store/useAppStore'

describe('AddScreen', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({ ...initialState })
  })

  it('typing updates the live preview', async () => {
    render(
      <MemoryRouter>
        <AddScreen />
      </MemoryRouter>
    )
    await userEvent.type(screen.getByLabelText('word'), 'ubiquitous')
    expect(screen.getByText('ubiquitous')).toBeInTheDocument()
  })
})
