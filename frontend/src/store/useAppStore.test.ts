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

  it('setReviewMode clears per-card state', () => {
    useAppStore.setState({ flipped: true, quizPick: 'A' })
    useAppStore.getState().setReviewMode('quiz')
    expect(useAppStore.getState().reviewMode).toBe('quiz')
    expect(useAppStore.getState().flipped).toBe(false)
    expect(useAppStore.getState().quizPick).toBe(null)
  })

  it('resetProgress clears session and imported decks', () => {
    useAppStore.setState({ sIndex: 3, sCorrect: 2, importedDecks: [{ name:'X', topic:'', count:0, cards:[] }], confirmReset: true })
    useAppStore.getState().resetProgress()
    const s = useAppStore.getState()
    expect(s.sIndex).toBe(0); expect(s.sCorrect).toBe(0)
    expect(s.importedDecks).toEqual([]); expect(s.confirmReset).toBe(false)
  })

  it('parseAndImport adds a valid deck', () => {
    useAppStore.getState().parseAndImport(JSON.stringify({ deck:'D', topic:'t', cards:[{ word:'a', meaning:'b' }] }))
    const s = useAppStore.getState()
    expect(s.importedDecks).toHaveLength(1)
    expect(s.importedDecks[0]).toMatchObject({ name:'D', count:1 })
    expect(s.importStatus?.ok).toBe(true)
    expect(s.importText).toBe('')
  })

  it('parseAndImport rejects invalid JSON', () => {
    useAppStore.getState().parseAndImport('{ not json')
    expect(useAppStore.getState().importStatus?.ok).toBe(false)
    expect(useAppStore.getState().importedDecks).toHaveLength(0)
  })

  it('parseAndImport rejects missing required fields', () => {
    useAppStore.getState().parseAndImport(JSON.stringify({ deck:'D', cards:[{ meaning:'no word' }] }))
    expect(useAppStore.getState().importStatus?.ok).toBe(false)
  })

  it('persists only whitelisted keys to snoopify_v1', () => {
    useAppStore.getState().setPanel('settingsOpen', true)
    useAppStore.getState().toggleDark()
    const raw = JSON.parse(localStorage.getItem('snoopify_v1')!)
    const persisted = raw.state ?? raw
    expect(persisted.dark).toBe(true)
    expect('settingsOpen' in persisted).toBe(false)
    expect('importStatus' in persisted).toBe(false)
  })
})
