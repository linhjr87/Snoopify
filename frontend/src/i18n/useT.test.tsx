import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useT } from './useT'
import { useAppStore } from '../store/useAppStore'

function Probe() { const t = useT(); return <span>{t.home}</span> }

describe('useT', () => {
  it('returns VN strings by default', () => {
    useAppStore.setState({ lang: 'vn' })
    render(<Probe />)
    expect(screen.getByText('Trang chủ')).toBeInTheDocument()
  })
  it('returns EN strings when lang=en', () => {
    useAppStore.setState({ lang: 'en' })
    render(<Probe />)
    expect(screen.getByText('Home')).toBeInTheDocument()
  })
})
