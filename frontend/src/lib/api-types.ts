// Mirrors backend Pydantic schemas (app/schemas/review.py, app/enums.py).
export interface QuizOptionOut { key: string; text: string }
export interface QuizOut { options: QuizOptionOut[]; correct_key: string }
export interface FillOut { before: string; after: string; answer: string; hint: string }

export interface ReviewItemOut {
  card_id: string
  word: string
  phonetic: string
  pos: string
  meaning: string
  example: string
  quiz: QuizOut
  fill: FillOut
}

export type Rating = 'forgot' | 'vague' | 'remember'
export type ReviewMode = 'flash' | 'quiz' | 'fill'

export interface GradeRequest {
  card_id: string
  rating: Rating
  mode: ReviewMode
  is_correct?: boolean | null
}

export interface GradeResult {
  card_id: string
  ease_factor: number
  interval_days: number
  repetitions: number
  lapses: number
  due_at: string
  last_reviewed_at: string
}
