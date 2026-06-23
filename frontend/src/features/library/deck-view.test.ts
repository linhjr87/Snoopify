import { describe, it, expect } from 'vitest'
import { toDeckCard, formatRelativeVi } from './deck-view'
import type { DeckOut } from '../../lib/api-types'

const base: DeckOut = {
  id: 'd1', name: 'Business English', topic: 'chủ đề', count: 92, due_count: 12,
  mastery_pct: 72, last_reviewed_at: null,
  created_at: '2026-06-10T00:00:00Z', updated_at: '2026-06-10T00:00:00Z',
}

describe('toDeckCard', () => {
  it('maps counts, mastery and bar width', () => {
    const c = toDeckCard(base)
    expect(c.name).toBe('Business English')
    expect(c.meta).toBe('92 thẻ · 12 đến hạn')
    expect(c.mastery).toBe('thành thạo 72%')
    expect(c.barW).toBe('72%')
    expect(c.tag).toBe('chủ đề')
    expect(c.needAttention).toBe(false)
  })
  it('flags low-mastery decks as needing attention', () => {
    const c = toDeckCard({ ...base, mastery_pct: 20 })
    expect(c.needAttention).toBe(true)
    expect(c.tag).toBe('cần chú ý')
  })
  it('shows "chưa ôn" when never reviewed', () => {
    expect(toDeckCard(base).last).toBe('chưa ôn')
  })
})

describe('formatRelativeVi', () => {
  it('returns chưa ôn for null', () => { expect(formatRelativeVi(null)).toBe('chưa ôn') })
  it('formats days/weeks ago', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString()
    expect(formatRelativeVi(threeDaysAgo)).toBe('3 ngày trước')
    const twoWeeksAgo = new Date(Date.now() - 14 * 86_400_000).toISOString()
    expect(formatRelativeVi(twoWeeksAgo)).toBe('2 tuần trước')
  })
})
