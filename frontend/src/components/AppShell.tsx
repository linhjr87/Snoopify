'use client'

import { Sidebar } from './layout/Sidebar'
import { Topbar } from './layout/Topbar'

export function AppShell({ children }: { children: React.ReactNode }) {
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
    </div>
  )
}
