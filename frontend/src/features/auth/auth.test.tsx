import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AuthScreen from './AuthScreen'
import { initialState, useAppStore } from '../../store/useAppStore'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }))
beforeEach(() => { localStorage.clear(); useAppStore.setState({ ...initialState }); push.mockClear() })
afterEach(() => { vi.restoreAllMocks() })

describe('AuthScreen (Next routing)', () => {
  it('logs in and navigates home', () => {
    render(<AuthScreen />)
    fireEvent.click(screen.getAllByRole('button', { name: /Tiếp tục|Đăng nhập/i })[0])
    expect(useAppStore.getState().isAuthenticated).toBe(true)
    expect(push).toHaveBeenCalledWith('/')
  })
})
