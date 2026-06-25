import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { submitGrade } from './grade'
import * as api from '../../lib/api'
import { initialState, useAppStore } from '../../store/useAppStore'

beforeEach(() => { useAppStore.setState({ ...initialState }) })
afterEach(() => { vi.restoreAllMocks() })

describe('submitGrade', () => {
  it('clears gradeError on successful post', async () => {
    vi.spyOn(api, 'apiPost').mockResolvedValue({} as never)
    useAppStore.setState({ gradeError: true })
    await submitGrade({ card_id: 'c1', rating: 'remember', mode: 'flash', is_correct: null })
    expect(useAppStore.getState().gradeError).toBe(false)
  })

  it('sets gradeError on failed post', async () => {
    vi.spyOn(api, 'apiPost').mockRejectedValue(new Error('network'))
    await submitGrade({ card_id: 'c1', rating: 'forgot', mode: 'quiz', is_correct: false })
    expect(useAppStore.getState().gradeError).toBe(true)
  })
})
