import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SpacedRepetitionRating } from './SpacedRepetitionRating'

describe('SpacedRepetitionRating', () => {
  it('calls onRate with the chosen rating when enabled', async () => {
    const onRate = vi.fn()
    render(<SpacedRepetitionRating onRate={onRate} />)
    await userEvent.click(screen.getByText('Nhớ'))
    expect(onRate).toHaveBeenCalledWith('remember')
  })

  it('does not call onRate when disabled', async () => {
    const onRate = vi.fn()
    render(<SpacedRepetitionRating onRate={onRate} disabled />)
    await userEvent.click(screen.getByText('Nhớ'))
    expect(onRate).not.toHaveBeenCalled()
  })
})
