import { AppRoutes } from './routes'
import { useAppStore } from './store/useAppStore'

export default function App() {
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
        minHeight: '100vh',
        background: 'var(--paper)',
        color: 'var(--ink)',
        fontFamily: "'Hanken Grotesk', sans-serif",
        WebkitFontSmoothing: 'antialiased',
        transition: 'background .3s ease, color .3s ease',
      }}
    >
      <AppRoutes />
    </div>
  )
}
