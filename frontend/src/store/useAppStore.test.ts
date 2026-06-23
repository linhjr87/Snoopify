import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore, initialState } from './useAppStore'

const reset = () => useAppStore.setState({ ...initialState })

describe('useAppStore', () => {
  beforeEach(() => { localStorage.clear(); reset() })

  it('advanceSession increments index and correct count', () => {
    useAppStore.getState().advanceSession(true)
    expect(useAppStore.getState().sIndex).toBe(1)
    expect(useAppStore.getState().sCorrect).toBe(1)
    useAppStore.getState().advanceSession(false)
    expect(useAppStore.getState().sIndex).toBe(2)
    expect(useAppStore.getState().sCorrect).toBe(1)
  })

  it('advanceSession resets per-card flags', () => {
    useAppStore.setState({ flipped: true, quizPick: 'A', fillValue: 'x', fillChecked: true })
    useAppStore.getState().advanceSession(true)
    const s = useAppStore.getState()
    expect([s.flipped, s.quizPick, s.fillValue, s.fillChecked]).toEqual([false, null, '', false])
  })

  it('setGradeError toggles the flag and resetSession clears it', () => {
    useAppStore.getState().setGradeError(true)
    expect(useAppStore.getState().gradeError).toBe(true)
    useAppStore.getState().resetSession()
    expect(useAppStore.getState().gradeError).toBe(false)
  })

  it('setReviewMode clears per-card state', () => {
    useAppStore.setState({ flipped: true, quizPick: 'A' })
    useAppStore.getState().setReviewMode('quiz')
    expect(useAppStore.getState().reviewMode).toBe('quiz')
    expect(useAppStore.getState().flipped).toBe(false)
    expect(useAppStore.getState().quizPick).toBe(null)
  })

  it('resetProgress clears session and closes panels', () => {
    useAppStore.setState({ sIndex: 3, sCorrect: 2, confirmReset: true, settingsOpen: true })
    useAppStore.getState().resetProgress()
    const s = useAppStore.getState()
    expect(s.sIndex).toBe(0); expect(s.sCorrect).toBe(0)
    expect(s.confirmReset).toBe(false); expect(s.settingsOpen).toBe(false)
  })

  it('persists only dark/lang/collapsed to snoopify_v1', () => {
    useAppStore.getState().setPanel('settingsOpen', true)
    useAppStore.setState({ sIndex: 4 })
    useAppStore.getState().toggleDark()
    const raw = JSON.parse(localStorage.getItem('snoopify_v1')!)
    const persisted = raw.state ?? raw
    expect(persisted.dark).toBe(true)
    expect('settingsOpen' in persisted).toBe(false)
    expect('sIndex' in persisted).toBe(false)
    expect('importedDecks' in persisted).toBe(false)
  })
})
