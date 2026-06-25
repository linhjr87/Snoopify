import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AuthScreen from './AuthScreen'
import * as api from '../../lib/api'

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }))
afterEach(() => { vi.restoreAllMocks(); push.mockClear() })

describe('AuthScreen (real auth)', () => {
  it('logs in via /auth/login then navigates home', async () => {
    const spy = vi.spyOn(api, 'apiPost').mockResolvedValue({} as never)
    render(<AuthScreen />)
    fireEvent.change(screen.getByLabelText('email'), { target: { value: 'a@example.com' } })
    fireEvent.change(screen.getByLabelText('password'), { target: { value: 's3cret!' } })
    fireEvent.click(screen.getByRole('button', { name: /Đăng nhập/i }))
    await vi.waitFor(() => expect(spy).toHaveBeenCalledWith('/auth/login',
      { email: 'a@example.com', password: 's3cret!' }))
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/'))
  })

  it('shows a Vietnamese error on 401', async () => {
    vi.spyOn(api, 'apiPost').mockRejectedValue(new api.ApiError(401, 'Invalid credentials'))
    render(<AuthScreen />)
    fireEvent.change(screen.getByLabelText('email'), { target: { value: 'a@example.com' } })
    fireEvent.change(screen.getByLabelText('password'), { target: { value: 'x' } })
    fireEvent.click(screen.getByRole('button', { name: /Đăng nhập/i }))
    await screen.findByText(/Email hoặc mật khẩu không đúng/i)
  })
})
