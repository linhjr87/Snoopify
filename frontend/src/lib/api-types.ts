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

export interface DeckOut {
  id: string
  name: string
  topic: string
  count: number
  due_count: number
  mastery_pct: number
  last_reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface ImportResult {
  ok: boolean
  msg: string
  deck?: DeckOut
}

export interface CardCreate {
  word: string
  phonetic?: string
  pos?: string
  meaning?: string
  example?: string
}

export interface CardOut {
  id: string
  deck_id: string
  word: string
  phonetic: string
  pos: string
  meaning: string
  example: string
  ease_factor: number
  interval_days: number
  repetitions: number
  lapses: number
  due_at: string
  last_reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface MasteryCounts { new: number; learning: number; proficient: number }
export interface WeeklyBar { label: string; count: number }
export interface ProgressSummary {
  streak: number
  reviews_today: number
  mastery: MasteryCounts
  weekly_bars: WeeklyBar[]
  due_total: number
}
export interface HeatmapOut { cells: number[] }
export interface NeedsReviewItem { card_id: string; word: string; lapses: number }
export interface WordOfDayOut {
  card_id: string
  word: string
  phonetic: string
  pos: string
  meaning: string
  example: string
}
