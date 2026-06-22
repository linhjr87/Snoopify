import type { ReviewItemOut } from './api-types'
import type { SessionItem } from '../data/seed'

export type SessionCard = SessionItem & { cardId: string }

export function toSessionItem(api: ReviewItemOut): SessionCard {
  return {
    cardId: api.card_id,
    word: api.word,
    phon: [api.phonetic, api.pos].filter(Boolean).join(' · '),
    meaning: api.meaning,
    example: api.example,
    quiz: {
      correct: api.quiz.correct_key,
      options: api.quiz.options.map((o) => [o.key, o.text] as [string, string]),
    },
    fill: {
      before: api.fill.before,
      after: api.fill.after,
      answer: api.fill.answer,
      hint: api.fill.hint,
    },
  }
}
