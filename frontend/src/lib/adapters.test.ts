import { describe, it, expect } from 'vitest'
import { toSessionItem } from './adapters'
import type { ReviewItemOut } from './api-types'

const sample: ReviewItemOut = {
  card_id: 'c1', word: 'resilient', phonetic: '/rɪˈzɪl.i.ənt/', pos: 'adjective',
  meaning: 'có khả năng phục hồi nhanh', example: 'She is so resilient.',
  quiz: {
    options: [
      { key: 'A', text: 'a' }, { key: 'B', text: 'b' },
      { key: 'C', text: 'c' }, { key: 'D', text: 'd' },
    ],
    correct_key: 'B',
  },
  fill: { before: 'She is', after: '.', answer: 'resilient', hint: 'r________' },
}

describe('toSessionItem', () => {
  it('joins phonetic and pos into phon', () => {
    expect(toSessionItem(sample).phon).toBe('/rɪˈzɪl.i.ənt/ · adjective')
  })
  it('carries cardId and maps quiz options to tuples + correct key', () => {
    const r = toSessionItem(sample)
    expect(r.cardId).toBe('c1')
    expect(r.quiz.correct).toBe('B')
    expect(r.quiz.options[1]).toEqual(['B', 'b'])
  })
  it('omits the separator when pos is empty', () => {
    expect(toSessionItem({ ...sample, pos: '' }).phon).toBe('/rɪˈzɪl.i.ənt/')
  })
})
