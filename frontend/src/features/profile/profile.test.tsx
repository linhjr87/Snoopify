import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProfileScreen from './ProfileScreen'
import { useAppStore, initialState } from '../../store/useAppStore'
import type { ProfileOut } from '../../lib/api-types'

const fixture: ProfileOut = {
  display_name: 'Minh Nguyen', username: 'minh', email: 'minh@example.com',
  created_at: '2024-03-15T00:00:00Z', level: 'B1', level_target: 'B2',
  goal_text: 'Communicate confidently at work', daily_target: 20,
  stats: { learned: 486, mastered: 213, streak: 12, accuracy: 87 },
  achievements: [
    { key: 'streak7', earned: true }, { key: 'mastered100', earned: true },
    { key: 'sessions10', earned: true }, { key: 'streak30', earned: false },
    { key: 'mastered500', earned: false }, { key: 'b2', earned: false },
  ],
}

describe('ProfileScreen', () => {
  beforeEach(() => { localStorage.clear(); useAppStore.setState({ ...initialState }) })

  it('renders identity, stats, goal and achievements', () => {
    render(<ProfileScreen profile={fixture} />)
    expect(screen.getByText('Minh Nguyen')).toBeInTheDocument()
    expect(screen.getByText('minh@example.com')).toBeInTheDocument()
    expect(screen.getByText('486')).toBeInTheDocument()           // learned
    expect(screen.getByText('87%')).toBeInTheDocument()           // accuracy
    expect(screen.getByText('Communicate confidently at work')).toBeInTheDocument()
    expect(screen.getByText('Chuỗi 7 ngày')).toBeInTheDocument()  // earned badge (vn default)
    expect(screen.getByText('Bậc thầy B2')).toBeInTheDocument()   // locked badge
    expect(screen.getByText('3 / 6 huy hiệu')).toBeInTheDocument()
  })

  it('shows a placeholder when no goal is set', () => {
    render(<ProfileScreen profile={{ ...fixture, goal_text: '' }} />)
    expect(screen.getByText('Chưa đặt mục tiêu')).toBeInTheDocument()
  })
})
