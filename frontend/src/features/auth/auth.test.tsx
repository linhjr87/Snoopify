import { beforeEach, describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AuthScreen from './AuthScreen'
import { initialState, useAppStore } from '../../store/useAppStore'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }))
beforeEach(() => { localStorage.clear(); useAppStore.setState({ ...initialState, _hasHydrated: true }); push.mockClear() })
afterEach(() => { vi.restoreAllMocks() })

describe('AuthScreen (Next routing)', () => {
  it('logs in via form submit and navigates home', () => {
    const { container } = render(<AuthScreen />)
    fireEvent.submit(container.querySelector('form')!)
    expect(useAppStore.getState().isAuthenticated).toBe(true)
    expect(push).toHaveBeenCalledWith('/')
  })
})
