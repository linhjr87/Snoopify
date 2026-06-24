import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { initialState, useAppStore } from '../store/useAppStore'
import { AppShell } from './AppShell'

const pushMock = vi.fn()
let currentPathname = '/'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => currentPathname,
}))

describe('AppShell', () => {
  beforeEach(() => {
    localStorage.clear()
    pushMock.mockReset()
    currentPathname = '/'
    useAppStore.setState({ ...initialState })
  })

  it('renders the layout shell around children', () => {
    render(
      <AppShell>
        <section>Page body</section>
      </AppShell>,
    )

    expect(screen.getByText('Snoopify')).toBeInTheDocument()
    expect(screen.getByText('Page body')).toBeInTheDocument()
    expect(screen.getByLabelText('Ngôn ngữ')).toBeInTheDocument()
  })

  it('routes sidebar clicks through Next navigation', async () => {
    render(
      <AppShell>
        <section>Page body</section>
      </AppShell>,
    )

    await userEvent.click(screen.getByText('Thư viện'))

    expect(pushMock).toHaveBeenCalledWith('/library')
  })
})
