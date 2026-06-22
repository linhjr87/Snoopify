import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Card } from './Card'
import { Button } from './Button'
import { TagPill } from './TagPill'
import { StatTile } from './StatTile'
import { ProgressBar } from './ProgressBar'
import { ProgressRing } from './ProgressRing'

describe('primitives', () => {
  it('Card renders children', () => {
    render(<Card>hi</Card>); expect(screen.getByText('hi')).toBeInTheDocument()
  })
  it('Button fires onClick and respects disabled', async () => {
    let n = 0
    const { rerender } = render(<Button onClick={() => n++}>go</Button>)
    await userEvent.click(screen.getByText('go')); expect(n).toBe(1)
    rerender(<Button onClick={() => n++} disabled>go</Button>)
    await userEvent.click(screen.getByText('go')); expect(n).toBe(1)
  })
  it('TagPill renders text', () => { render(<TagPill>chủ đề</TagPill>); expect(screen.getByText('chủ đề')).toBeInTheDocument() })
  it('StatTile shows value and label', () => {
    render(<StatTile value="486" label="thẻ đã học" />)
    expect(screen.getByText('486')).toBeInTheDocument()
    expect(screen.getByText('thẻ đã học')).toBeInTheDocument()
  })
  it('ProgressBar clamps width style', () => {
    const { container } = render(<ProgressBar value={68} />)
    const fill = container.querySelector('[data-fill]') as HTMLElement
    expect(fill.style.width).toBe('68%')
  })
  it('ProgressRing renders an svg with label', () => {
    render(<ProgressRing value={8} max={24} label="8/24" />)
    expect(screen.getByText('8/24')).toBeInTheDocument()
  })
})
