import type { ReviewMode } from '../lib/api-types'
export type { ReviewMode }
export type Lang = 'vn' | 'en'

export interface ImportStatus { ok: boolean; msg: string }

export interface AppState {
  reviewMode: ReviewMode
  flipped: boolean
  quizPick: string | null
  fillValue: string
  fillChecked: boolean
  sIndex: number
  sCorrect: number
  gradeError: boolean
  dark: boolean
  lang: Lang
  collapsed: boolean
  settingsOpen: boolean
  confirmReset: boolean
  importOpen: boolean
  notifOpen: boolean
  langMenuOpen: boolean
  importText: string
}

export interface AppActions {
  setReviewMode(mode: ReviewMode): void
  flip(): void
  pickQuiz(key: string): void
  setFill(value: string): void
  checkFill(): void
  advanceSession(correct: boolean): void
  resetSession(): void
  setGradeError(value: boolean): void
  toggleDark(): void
  setLang(lang: Lang): void
  toggleCollapsed(): void
  setPanel(panel: 'settingsOpen' | 'confirmReset' | 'importOpen' | 'notifOpen' | 'langMenuOpen', open: boolean): void
  setImportText(text: string): void
  resetProgress(): void
}

export type AppStore = AppState & AppActions
