'use client'

import { useEffect } from 'react'
import { Sidebar } from './layout/Sidebar'
import { Topbar } from './layout/Topbar'
import { GuidedTourOverlay } from './layout/GuidedTourOverlay'
import { useTourStore } from '../store/useTourStore'

export function AppShell({ children }: { children: React.ReactNode }) {
  const startTour = useTourStore((s) => s.startTour)
  useEffect(() => {
    let tourDone: string | null
    try { tourDone = localStorage.getItem('myenglish_tour_done') } catch { tourDone = '1' }
    if (tourDone === '1') return
    const id = setTimeout(startTour, 450)
    return () => clearTimeout(id)
  }, [startTour])

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--paper)',
        color: 'var(--ink)',
        fontFamily: "'Hanken Grotesk', sans-serif",
        WebkitFontSmoothing: 'antialiased',
        transition: 'background .3s ease, color .3s ease',
      }}
    >
      <Sidebar />
      <main
        style={{
          flex: 1,
          minWidth: 0,
          padding: '34px 46px 60px',
          maxWidth: 1200,
        }}
      >
        <Topbar />
        {children}
      </main>
      <GuidedTourOverlay />
    </div>
  )
}
