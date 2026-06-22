import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Modal } from './Modal'
import { Toggle } from './Toggle'
import { SearchInput } from './SearchInput'
import { Heatmap } from './Heatmap'
import { BarChart } from './BarChart'

describe('interactive primitives', () => {
  it('Modal hidden when closed, visible when open', () => {
    const { rerender } = render(<Modal open={false} onClose={() => {}}>body</Modal>)
    expect(screen.queryByText('body')).not.toBeInTheDocument()
    rerender(<Modal open onClose={() => {}}>body</Modal>)
    expect(screen.getByText('body')).toBeInTheDocument()
  })
  it('Modal close button calls onClose', async () => {
    const onClose = vi.fn()
    render(<Modal open onClose={onClose} title="T">body</Modal>)
    await userEvent.click(screen.getByLabelText('close'))
    expect(onClose).toHaveBeenCalled()
  })
  it('Toggle calls onChange with next value', async () => {
    const onChange = vi.fn()
    render(<Toggle checked={false} onChange={onChange} />)
    await userEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })
  it('SearchInput emits typed value', async () => {
    const onChange = vi.fn()
    render(<SearchInput value="" onChange={onChange} placeholder="tìm" />)
    await userEvent.type(screen.getByPlaceholderText('tìm'), 'a')
    expect(onChange).toHaveBeenCalledWith('a')
  })
  it('Heatmap renders one cell per level', () => {
    const { container } = render(<Heatmap levels={[0,1,2,3]} />)
    expect(container.querySelectorAll('[data-cell]').length).toBe(4)
  })
  it('BarChart renders a bar per item with label', () => {
    render(<BarChart bars={[{label:'T2',h:55},{label:'T3',h:80}]} />)
    expect(screen.getByText('T2')).toBeInTheDocument()
    expect(screen.getByText('T3')).toBeInTheDocument()
  })
})
