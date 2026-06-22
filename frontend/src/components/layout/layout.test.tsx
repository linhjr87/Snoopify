import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from '../../App'
import { useAppStore, initialState } from '../../store/useAppStore'

const renderApp = (path = '/') => render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>)

describe('layout', () => {
  beforeEach(() => { localStorage.clear(); useAppStore.setState({ ...initialState }) })
  it('shows Snoopify brand', () => { renderApp(); expect(screen.getByText('Snoopify')).toBeInTheDocument() })
  it('settings trigger opens panel with dark toggle', async () => {
    renderApp()
    await userEvent.click(screen.getByLabelText('Cài đặt'))
    expect(screen.getByText('Chế độ tối')).toBeInTheDocument()
  })
  it('reset requires confirm step', async () => {
    useAppStore.setState({ settingsOpen: true })
    renderApp()
    await userEvent.click(screen.getByText('Đặt lại tiến độ'))
    expect(screen.getByText('Xoá hết')).toBeInTheDocument()
  })
})
