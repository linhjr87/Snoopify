import { describe, it, expect, beforeEach } from 'vitest'
import { useTourStore } from './useTourStore'
import { useAppStore, initialState } from './useAppStore'

describe('useTourStore sidebar coordination', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({ ...initialState })
    useTourStore.setState({ tourActive: false, tourStep: 0, tourRect: null, tourGen: 0, priorCollapsed: false })
  })

  it('expands a collapsed sidebar when the tour starts', () => {
    useAppStore.setState({ collapsed: true })
    useTourStore.getState().startTour()
    expect(useAppStore.getState().collapsed).toBe(false)
    expect(useTourStore.getState().priorCollapsed).toBe(true)
  })

  it('restores the collapsed sidebar when the tour ends', () => {
    useAppStore.setState({ collapsed: true })
    useTourStore.getState().startTour()
    useTourStore.getState().endTour()
    expect(useAppStore.getState().collapsed).toBe(true)
  })

  it('leaves an already-expanded sidebar expanded through the tour', () => {
    useAppStore.setState({ collapsed: false })
    useTourStore.getState().startTour()
    useTourStore.getState().endTour()
    expect(useAppStore.getState().collapsed).toBe(false)
  })
})
