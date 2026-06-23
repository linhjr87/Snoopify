import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppStore, AppState, Deck } from './types'
import { applyTheme } from '../theme/tokens'

export const initialState: AppState = {
  reviewMode: 'flash', flipped: false, quizPick: null, fillValue: '', fillChecked: false,
  sIndex: 0, sCorrect: 0, gradeError: false, dark: false, lang: 'vn', collapsed: false,
  settingsOpen: false, confirmReset: false, importOpen: false, notifOpen: false, langMenuOpen: false,
  importText: '', importStatus: null, importedDecks: [],
}

const PERSIST_KEYS: (keyof AppState)[] = [
  'reviewMode','flipped','quizPick','sIndex','sCorrect','fillValue','fillChecked',
  'importedDecks','dark','lang','collapsed',
]

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      setReviewMode: (mode) => set({ reviewMode: mode, flipped: false, quizPick: null, fillValue: '', fillChecked: false }),
      flip: () => set((s) => ({ flipped: !s.flipped })),
      pickQuiz: (key) => set((s) => (s.quizPick == null ? { quizPick: key } : {})),
      setFill: (value) => set({ fillValue: value }),
      checkFill: () => set({ fillChecked: true }),
      advanceSession: (correct) => set((s) => ({
        sCorrect: s.sCorrect + (correct ? 1 : 0), sIndex: s.sIndex + 1,
        flipped: false, quizPick: null, fillValue: '', fillChecked: false,
      })),
      resetSession: () => set({ sIndex: 0, sCorrect: 0, flipped: false, quizPick: null, fillValue: '', fillChecked: false, gradeError: false }),
      setGradeError: (value) => set({ gradeError: value }),
      toggleDark: () => { const dark = !get().dark; set({ dark }); applyTheme(dark) },
      setLang: (lang) => set({ lang, langMenuOpen: false }),
      toggleCollapsed: () => set((s) => ({ collapsed: !s.collapsed })),
      setPanel: (panel, open) => set({ [panel]: open } as Partial<AppState>),
      setImportText: (text) => set({ importText: text }),
      parseAndImport: (text) => {
        try {
          const data = JSON.parse(text)
          const name = data.deck || data.name
          const cards = data.cards
          if (!name || !Array.isArray(cards) || cards.length === 0) throw new Error('format')
          const clean = cards.filter((c: any) => c && c.word).map((c: any) => ({
            word: String(c.word), phonetic: c.phonetic || '', pos: c.pos || '', meaning: c.meaning || '', example: c.example || '',
          }))
          if (clean.length === 0) throw new Error('empty')
          const deck: Deck = { name: String(name), topic: data.topic || '', count: clean.length, cards: clean }
          set((s) => ({ importedDecks: [...s.importedDecks, deck], importStatus: { ok: true, msg: 'Đã nhập "' + name + '" · ' + clean.length + ' thẻ' }, importText: '' }))
        } catch {
          set({ importStatus: { ok: false, msg: 'JSON không hợp lệ hoặc thiếu trường bắt buộc (deck, cards[].word).' } })
        }
      },
      resetProgress: () => set({ sIndex: 0, sCorrect: 0, flipped: false, quizPick: null, fillValue: '', fillChecked: false, importedDecks: [], confirmReset: false, settingsOpen: false }),
    }),
    {
      name: 'snoopify_v1',
      partialize: (s) => Object.fromEntries(PERSIST_KEYS.map((k) => [k, s[k]])) as Partial<AppState>,
      onRehydrateStorage: () => (state) => { if (state) applyTheme(state.dark) },
    },
  ),
)
