import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChatPanel } from './ChatPanel'
import { useAppStore, initialState } from '../../store/useAppStore'

describe('ChatPanel', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({ ...initialState })
  })

  it('shows the FAB when closed and no panel', () => {
    render(<ChatPanel />)
    expect(screen.getByLabelText('open AI chat')).toBeInTheDocument()
    expect(screen.queryByLabelText('AI assistant')).not.toBeInTheDocument()
  })

  it('opens the panel with a disabled input when the FAB is clicked', async () => {
    render(<ChatPanel />)
    await userEvent.click(screen.getByLabelText('open AI chat'))
    expect(screen.getByLabelText('AI assistant')).toBeInTheDocument()
    expect(screen.getByLabelText('chat message')).toBeDisabled()
    expect(screen.getByLabelText('send')).toBeDisabled()
  })

  it('closes the panel and restores the FAB', async () => {
    useAppStore.setState({ chatOpen: true })
    render(<ChatPanel />)
    await userEvent.click(screen.getByLabelText('close chat'))
    expect(screen.queryByLabelText('AI assistant')).not.toBeInTheDocument()
    expect(screen.getByLabelText('open AI chat')).toBeInTheDocument()
  })
})
