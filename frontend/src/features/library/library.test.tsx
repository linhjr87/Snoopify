import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LibraryScreen from './LibraryScreen'
import { useAppStore, initialState } from '../../store/useAppStore'

const renderLib = () => render(<MemoryRouter><LibraryScreen /></MemoryRouter>)
describe('LibraryScreen', () => {
  beforeEach(() => { localStorage.clear(); useAppStore.setState({ ...initialState }) })
  it('lists seed decks', () => { renderLib(); expect(screen.getByText('Business English')).toBeInTheDocument() })
  it('import: invalid JSON shows error', async () => {
    useAppStore.setState({ importOpen: true })
    renderLib()
    // Use paste to avoid userEvent keyboard special-character parsing issues
    await userEvent.click(screen.getByLabelText('json'))
    await userEvent.paste('{ bad')
    // Click the import button inside the modal (primary variant = bg-accent)
    const buttons = screen.getAllByText('Nhập từ JSON')
    const importBtn = buttons.find(el => el.tagName === 'BUTTON' && el.className.includes('bg-accent'))!
    await userEvent.click(importBtn)
    expect(screen.getByText(/JSON không hợp lệ/)).toBeInTheDocument()
  })
  it('import: valid JSON adds a deck', async () => {
    useAppStore.setState({ importOpen: true, importText: JSON.stringify({ deck: 'My Deck', cards: [{ word: 'x' }] }) })
    renderLib()
    const buttons = screen.getAllByText('Nhập từ JSON')
    const importBtn = buttons.find(el => el.tagName === 'BUTTON' && el.className.includes('bg-accent'))!
    await userEvent.click(importBtn)
    expect(screen.getByText('My Deck')).toBeInTheDocument()
  })
})
