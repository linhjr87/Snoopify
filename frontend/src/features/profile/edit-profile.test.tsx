import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditProfileModal } from './EditProfileModal'
import type { ProfileOut } from '../../lib/api-types'
import * as api from '../../lib/api'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))

const profile: ProfileOut = {
  display_name: 'Minh', username: 'minh', email: 'minh@example.com', created_at: '2024-03-15T00:00:00Z',
  level: 'B1', level_target: 'B2', goal_text: 'Work fluently', daily_target: 20,
  stats: { learned: 1, mastered: 0, streak: 0, accuracy: 0 }, achievements: [],
}

describe('EditProfileModal', () => {
  beforeEach(() => { vi.restoreAllMocks() })

  it('submits a PATCH with the edited fields', async () => {
    const spy = vi.spyOn(api, 'apiPatch').mockResolvedValue(profile)
    render(<EditProfileModal profile={profile} onClose={() => {}} />)
    await userEvent.clear(screen.getByLabelText('display_name'))
    await userEvent.type(screen.getByLabelText('display_name'), 'Minh N')
    await userEvent.click(screen.getByText('Lưu'))
    expect(spy).toHaveBeenCalledWith('/profile', expect.objectContaining({ display_name: 'Minh N', username: 'minh', level: 'B1', daily_target: 20 }))
  })

  it('shows the username-taken message on 409', async () => {
    vi.spyOn(api, 'apiPatch').mockRejectedValue(new api.ApiError(409, 'Username already taken'))
    render(<EditProfileModal profile={profile} onClose={() => {}} />)
    await userEvent.click(screen.getByText('Lưu'))
    expect(await screen.findByText('Tên đăng nhập đã tồn tại')).toBeInTheDocument()
  })
})
