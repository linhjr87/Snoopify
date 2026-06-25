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

  it('shows "Email đã được đăng ký" on 409 during register', async () => {
    vi.spyOn(api, 'apiPost').mockRejectedValue(new api.ApiError(409, 'Email already registered'))
    render(<AuthScreen />)
    // Switch to signup mode via the "Đăng ký" button in the footer
    fireEvent.click(screen.getByRole('button', { name: /Đăng ký/i }))
    fireEvent.change(screen.getByLabelText('display_name'), { target: { value: 'Test User' } })
    fireEvent.change(screen.getByLabelText('email'), { target: { value: 'taken@example.com' } })
    fireEvent.change(screen.getByLabelText('password'), { target: { value: 's3cret!' } })
    fireEvent.change(screen.getByLabelText('confirm_password'), { target: { value: 's3cret!' } })
    fireEvent.click(screen.getByRole('button', { name: /Tạo tài khoản/i }))
    await screen.findByText(/Email đã được đăng ký/i)
  })

  it('shows mismatch error without calling apiPost when passwords differ', async () => {
    const spy = vi.spyOn(api, 'apiPost').mockResolvedValue({} as never)
    render(<AuthScreen />)
    // Switch to signup mode
    fireEvent.click(screen.getByRole('button', { name: /Đăng ký/i }))
    fireEvent.change(screen.getByLabelText('display_name'), { target: { value: 'Test User' } })
    fireEvent.change(screen.getByLabelText('email'), { target: { value: 'new@example.com' } })
    fireEvent.change(screen.getByLabelText('password'), { target: { value: 's3cret!' } })
    fireEvent.change(screen.getByLabelText('confirm_password'), { target: { value: 'different!' } })
    fireEvent.click(screen.getByRole('button', { name: /Tạo tài khoản/i }))
    await screen.findByText(/Mật khẩu nhập lại không khớp/i)
    expect(spy).not.toHaveBeenCalled()
  })
})
