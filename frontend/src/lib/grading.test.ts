import { describe, it, expect } from 'vitest'
import { norm, quizIsRight, fillIsRight } from './grading'

describe('grading', () => {
  it('norm trims, lowercases, collapses spaces', () => {
    expect(norm('  Put   Off ')).toBe('put off')
  })
  it('quizIsRight compares keys', () => {
    expect(quizIsRight('B', 'B')).toBe(true)
    expect(quizIsRight('A', 'B')).toBe(false)
  })
  it('fillIsRight is case/space-insensitive', () => {
    expect(fillIsRight(' Resilient ', 'resilient')).toBe(true)
    expect(fillIsRight('wrong', 'resilient')).toBe(false)
  })
})
