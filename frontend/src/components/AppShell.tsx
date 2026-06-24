'use client'

import { Sidebar } from './layout/Sidebar'
import { Topbar } from './layout/Topbar'
import { useAppStore } from '../store/useAppStore'

export function AppShell({ children }: { children: React.ReactNode }) {
  const dark = useAppStore((s) => s.dark)
  const accentSoft = dark ? '#1e3a30' : '#e7efea'
  const accent = '#2f5d4e'
  const sidebarBg = dark ? 'var(--surface)' : 'var(--paper)'

  return (
    <div
      style={{
        ['--clay' as string]: '#a96440',
        ['--rust' as string]: '#a8503f',
        ['--gold' as string]: '#8a6d12',
        ['--accent' as string]: accent,
        ['--accent-soft' as string]: accentSoft,
        ['--sidebar' as string]: sidebarBg,
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
