import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppStore, AppState } from './types'
import { applyTheme } from '../theme/tokens'

export const initialState: AppState = {
  reviewMode: 'flash', flipped: false, quizPick: null, fillValue: '', fillChecked: false,
  sIndex: 0, sCorrect: 0, gradeError: false, dark: false, lang: 'vn', collapsed: false,
  settingsOpen: false, confirmReset: false, importOpen: false, notifOpen: false, langMenuOpen: false,
  importText: '',
  isAuthenticated: false, hasOnboarded: false,
}

const PERSIST_KEYS: (keyof AppState)[] = ['dark', 'lang', 'collapsed', 'isAuthenticated', 'hasOnboarded']

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
      resetProgress: () => set({ sIndex: 0, sCorrect: 0, flipped: false, quizPick: null, fillValue: '', fillChecked: false, confirmReset: false, settingsOpen: false }),
      login: () => set({ isAuthenticated: true }),
      logout: () => set({
        isAuthenticated: false, hasOnboarded: false,
        settingsOpen: false, confirmReset: false, importOpen: false, notifOpen: false, langMenuOpen: false,
      }),
      completeOnboarding: () => set({ hasOnboarded: true }),
    }),
    {
      name: 'snoopify_v1',
      partialize: (s) => Object.fromEntries(PERSIST_KEYS.map((k) => [k, s[k]])) as Partial<AppState>,
      onRehydrateStorage: () => (state) => { if (state) applyTheme(state.dark) },
    },
  ),
)
