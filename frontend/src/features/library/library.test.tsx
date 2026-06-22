import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LibraryScreen from './LibraryScreen'
import { useAppStore, initialState } from '../../store/useAppStore'

const renderLib = () => render(<MemoryRouter><LibraryScreen /></MemoryRouter>)

// The "Nhập" button is the dark submit button inside the import modal (text = "Nhập").
// We use getByRole('button', { name: 'Nhập' }) once the modal is open.
describe('LibraryScreen', () => {
  beforeEach(() => { localStorage.clear(); useAppStore.setState({ ...initialState }) })
  it('lists seed decks', () => { renderLib(); expect(screen.getByText('Business English')).toBeInTheDocument() })
  it('import: invalid JSON shows error', async () => {
    useAppStore.setState({ importOpen: true })
    renderLib()
    await userEvent.click(screen.getByLabelText('json'))
    await userEvent.paste('{ bad')
    await userEvent.click(screen.getByRole('button', { name: 'Nhập' }))
    expect(screen.getByText(/JSON không hợp lệ/)).toBeInTheDocument()
  })
  it('import: valid JSON adds a deck', async () => {
    useAppStore.setState({ importOpen: true, importText: JSON.stringify({ deck: 'My Deck', cards: [{ word: 'x' }] }) })
    renderLib()
    await userEvent.click(screen.getByRole('button', { name: 'Nhập' }))
    expect(screen.getByText('My Deck')).toBeInTheDocument()
  })
})
