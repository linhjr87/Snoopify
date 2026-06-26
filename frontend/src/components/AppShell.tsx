'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './layout/Sidebar'
import { Topbar } from './layout/Topbar'
import { GuidedTourOverlay } from './layout/GuidedTourOverlay'
import { ChatPanel } from './layout/ChatPanel'
import { useTourStore } from '../store/useTourStore'
import type { ProgressSummary, DeckOut } from '../lib/api-types'

export function AppShell({ children, displayName, summary, decks }: {
  children: React.ReactNode
  displayName?: string | null
  summary?: ProgressSummary | null
  decks?: DeckOut[]
}) {
  const startTour = useTourStore((s) => s.startTour)
  const pathname = usePathname()

  useEffect(() => {
    if (pathname === '/login') return
    let tourDone: string | null
    try { tourDone = localStorage.getItem('myenglish_tour_done') } catch { tourDone = '1' }
    if (tourDone === '1') return
    const id = setTimeout(startTour, 450)
    return () => clearTimeout(id)
  }, [startTour, pathname])

  if (pathname === '/login') return <>{children}</>

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
      <Sidebar displayName={displayName} summary={summary} decks={decks} />
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
      <ChatPanel />
    </div>
  )
}
