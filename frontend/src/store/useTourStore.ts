import { create } from 'zustand'

export interface TourRect {
  top: number
  left: number
  width: number
  height: number
}

interface TourState {
  tourActive: boolean
  tourStep: number
  tourRect: TourRect | null
  tourSels: string[]
  startTour: () => void
  endTour: () => void
  tourNext: () => void
  tourBack: () => void
  syncTourRect: () => void
  goTour: (step: number) => void
}

export const useTourStore = create<TourState>((set, get) => ({
  tourActive: false,
  tourStep: 0,
  tourRect: null,
  tourSels: ['nav', 'search', 'review', 'add', 'streak', 'decks'],

  syncTourRect: () => {
    const { tourStep, tourSels } = get()
    const sel = tourSels[tourStep]
    const el = sel ? document.querySelector(`[data-tour="${sel}"]`) : null
    if (!el) {
      set({ tourRect: null })
      return
    }
    const r = el.getBoundingClientRect()
    set({ tourRect: { top: r.top, left: r.left, width: r.width, height: r.height } })
  },

  goTour: (step: number) => {
    set({ tourStep: step })
    setTimeout(() => {
      const { tourSels, syncTourRect } = get()
      const sel = tourSels[step]
      const el = sel ? document.querySelector(`[data-tour="${sel}"]`) : null
      if (el) {
        const r = el.getBoundingClientRect()
        if (r.top < 96 || r.bottom > window.innerHeight - 150) {
          window.scrollTo({ top: Math.max(0, window.scrollY + r.top - 150), behavior: 'smooth' })
          setTimeout(syncTourRect, 380)
          return
        }
      }
      syncTourRect()
    }, 60)
  },

  startTour: () => {
    try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch (e) {}
    set({ tourActive: true, tourStep: 0 })
    setTimeout(() => get().goTour(0), 180)
  },

  endTour: () => {
    try { 
      localStorage.setItem('myenglish_tour_done', '1') 
    } catch (e) {}
    set({ tourActive: false, tourStep: 0, tourRect: null })
  },

  tourNext: () => {
    const { tourStep, tourSels, endTour, goTour } = get()
    if (tourStep >= tourSels.length - 1) endTour()
    else goTour(tourStep + 1)
  },

  tourBack: () => {
    const { tourStep, goTour } = get()
    if (tourStep > 0) goTour(tourStep - 1)
  }
}))
