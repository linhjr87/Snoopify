'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useAppStore } from '../../store/useAppStore'
import { useTourStore } from '../../store/useTourStore'
import { useT } from '../../i18n/useT'
import { NotificationsMenu } from './NotificationsMenu'
import { LangMenu } from './LangMenu'

const MoonIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 10.5A6 6 0 1 1 7.5 3a4.5 4.5 0 0 0 7.5 7.5z" />
  </svg>
)

const SunIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="9" r="3.5" />
    <path d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M4.1 4.1l1.4 1.4M12.5 12.5l1.4 1.4M4.1 13.9l1.4-1.4M12.5 5.5l1.4-1.4" />
  </svg>
)

const BellIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 2a5 5 0 0 0-5 5v3l-1.5 2h13L14 10V7a5 5 0 0 0-5-5z" />
    <path d="M7.5 15.5a1.5 1.5 0 0 0 3 0" />
  </svg>
)

const ChevronDownIcon = () => (
  <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 4l4 4 4-4" />
  </svg>
)

export function Topbar() {
  const t = useT()
  const dark = useAppStore((s) => s.dark)
  const lang = useAppStore((s) => s.lang)
  const notifOpen = useAppStore((s) => s.notifOpen)
  const notifRead = useAppStore((s) => s.notifRead)
  const langMenuOpen = useAppStore((s) => s.langMenuOpen)
  const toggleDark = useAppStore((s) => s.toggleDark)
  const setPanel = useAppStore((s) => s.setPanel)

  const startTour = useTourStore((s) => s.startTour)
  const router = useRouter()
  const pathname = usePathname()

  // The tour highlights dashboard-only anchors (search/review/streak/decks),
  // so always land on the dashboard before starting it.
  const handleGuide = () => {
    if (pathname !== '/') router.push('/')
    startTour()
  }

  const currentFlag = lang === 'en' ? '🇬🇧' : '🇻🇳'
  const currentLangName = lang === 'en' ? 'English' : 'Tiếng Việt'

  return (
    <div
      className="topbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 24,
      }}
    >
      {/* Guide button */}
      <button
        onClick={handleGuide}
        aria-label="guide"
        style={{
          marginRight: 'auto',
          border: '1px solid var(--line)',
          background: 'var(--surface)',
          color: 'var(--muted)',
          cursor: 'pointer',
          padding: '7px 14px',
          borderRadius: 999,
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          fontFamily: "'Hanken Grotesk',sans-serif",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="8" cy="8" r="6.5"/>
          <path d="M8 11V8M8 5h.01"/>
        </svg>
        {lang === 'en' ? 'Guide' : 'Hướng dẫn'}
      </button>

      {/* Dark toggle */}
      <button
        onClick={toggleDark}
        aria-label={t.darkMode}
        style={{
          border: 'none',
          background: 'transparent',
          color: 'var(--muted)',
          cursor: 'pointer',
          padding: 4,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {dark ? <SunIcon /> : <MoonIcon />}
      </button>

      {/* Lang menu */}
      <div style={{ position: 'relative' }}>
        <button
          aria-label={t.language}
          onClick={() => setPanel('langMenuOpen', !langMenuOpen)}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            color: 'var(--ink)',
            fontSize: 15,
            fontWeight: 500,
            padding: 4,
            fontFamily: "'Hanken Grotesk', sans-serif",
          }}
        >
          <span style={{ fontSize: 18 }}>{currentFlag}</span>
          {currentLangName}
          <ChevronDownIcon />
        </button>
        <LangMenu />
      </div>

      {/* Notifications */}
      <div style={{ position: 'relative' }}>
        <button
          aria-label={t.notif}
          onClick={() => setPanel('notifOpen', !notifOpen)}
          style={{
            border: 'none',
            background: 'transparent',
            color: 'var(--muted)',
            cursor: 'pointer',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            position: 'relative',
          }}
        >
          <BellIcon />
          {!notifRead && (
            <span
              data-testid="bell-unread-dot"
              style={{
                position: 'absolute',
                top: 2,
                right: 3,
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--rust)',
                border: '1.5px solid var(--paper)',
              }}
            />
          )}
        </button>
        <NotificationsMenu />
      </div>
    </div>
  )
}
