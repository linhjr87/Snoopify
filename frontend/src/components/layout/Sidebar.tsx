'use client'

import { useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import { SettingsPanel } from './SettingsPanel'
import type { ProgressSummary, DeckOut } from '../../lib/api-types'

const DECK_DOT_COLORS = ['var(--accent,#2f5d4e)', '#c9a23a']

const navItems = (t: ReturnType<typeof useT>) => [
  {
    to: '/', label: t.home,
    icon: (
      <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2.5 8.5L9 3l6.5 5.5" /><path d="M4 8v6.5h10V8" />
      </svg>
    ),
  },
  {
    to: '/library', label: t.library,
    icon: (
      <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 2.6l6.4 3.4L9 9.4 2.6 6z" /><path d="M2.6 10L9 13.4 15.4 10" />
      </svg>
    ),
  },
  {
    to: '/review', label: t.review,
    icon: (
      <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 6A5.6 5.6 0 1 0 15.2 10" /><path d="M14.6 2.8v3.3h-3.2" />
      </svg>
    ),
  },
  {
    to: '/add', label: t.add,
    icon: (
      <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3.5v11M3.5 9h11" />
      </svg>
    ),
  },
  {
    to: '/progress', label: t.progress,
    icon: (
      <svg width="17" height="17" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 14.5V8.5M8 14.5V4M13 14.5v-4" />
      </svg>
    ),
  },
]

export function Sidebar({ displayName, summary, decks }: {
  displayName?: string | null
  summary?: ProgressSummary | null
  decks?: DeckOut[]
}) {
  const t = useT()
  const router = useRouter()
  const pathname = usePathname()
  const collapsed = useAppStore((s) => s.collapsed)
  const toggleCollapsed = useAppStore((s) => s.toggleCollapsed)
  const settingsOpen = useAppStore((s) => s.settingsOpen)
  const setPanel = useAppStore((s) => s.setPanel)
  const streak = summary?.streak ?? 0

  const recentDecks = useMemo(() => {
    return [...(decks ?? [])]
      .sort((a, b) => {
        if (!a.last_reviewed_at && !b.last_reviewed_at) return 0
        if (!a.last_reviewed_at) return 1
        if (!b.last_reviewed_at) return -1
        return b.last_reviewed_at.localeCompare(a.last_reviewed_at)
      })
      .slice(0, 3)
  }, [decks])

  const items = navItems(t)

  return (
    <aside
      className={`sidebar${collapsed ? ' collapsed' : ''}`}
      style={{
        width: 248,
        flex: 'none',
        borderRight: '1px solid var(--line)',
        padding: '26px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 26,
        background: 'var(--sidebar)',
        position: 'sticky',
        top: 0,
        height: '100vh',
      }}
    >
      {/* Brand */}
      <div
        className="brand"
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px' }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 9,
            background: 'var(--accent,#2f5d4e)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'Newsreader', serif",
            fontSize: 18,
            fontWeight: 600,
          }}
        >
          S
        </div>
        <div
          className="brand-text"
          style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.01em' }}
        >
          Snoopify
        </div>
      </div>

      {/* Collapse FAB */}
      <button
        onClick={toggleCollapsed}
        className="collapse-fab"
        aria-label={t.collapse}
        style={{
          position: 'absolute',
          top: 27,
          right: -14,
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: '1px solid var(--line)',
          background: 'var(--surface)',
          color: 'var(--muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 7px rgba(40,35,25,0.16)',
          zIndex: 6,
          padding: 0,
        }}
      >
        {collapsed ? (
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 2l4 4-4 4" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2L4 6l4 4" />
          </svg>
        )}
      </button>

      {/* Nav */}
      <nav className="nav-main" data-tour="nav" style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div
          className="nav-heading"
          style={{
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            padding: '0 10px 8px',
          }}
        >
          {t.learn.toUpperCase()}
        </div>
        {items.map((item) => {
          const isActive = item.to === '/'
            ? pathname === '/'
            : pathname.startsWith(item.to)
          return (
            <div
              key={item.to}
              className="navitem"
              data-tour={item.to === '/add' ? 'add' : undefined}
              onClick={() => router.push(item.to)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '9px 11px',
                borderRadius: 9,
                cursor: 'pointer',
                background: isActive ? 'var(--accent-soft)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--ink)',
                fontWeight: isActive ? 600 : 400,
                fontSize: 14,
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </div>
          )
        })}
      </nav>

      {/* Decks */}
      <div className="side-decks" data-tour="decks" style={{ marginTop: 6, padding: '0 10px' }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
            paddingBottom: 10,
          }}
        >
          {t.decks.toUpperCase()}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 14 }}>
          {recentDecks.length === 0 && (
            <div style={{ color: 'var(--muted)' }}>{t.noDeckYet}</div>
          )}
          {recentDecks.map((deck, i) => (
            <div
              key={deck.id}
              onClick={() => router.push('/library')}
              style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}
            >
              <span style={{ width: 8, height: 8, borderRadius: 2, background: DECK_DOT_COLORS[i % DECK_DOT_COLORS.length], display: 'inline-block' }} />
              {deck.name}
            </div>
          ))}
          {(decks ?? []).length > 3 && (
            <div
              onClick={() => router.push('/library')}
              style={{ color: 'var(--accent,#2f5d4e)', cursor: 'pointer' }}
            >
              {t.viewAll}
            </div>
          )}
          <div
            onClick={() => router.push('/progress')}
            style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer', color: 'var(--rust)' }}
          >
            <span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--rust)', display: 'inline-block' }} />
            {t.myMistakesDeck}
          </div>
        </div>
      </div>

      {/* User footer */}
      <div className="side-user" style={{ marginTop: 'auto', position: 'relative' }}>
        {/* Settings popup */}
        {settingsOpen && <SettingsPanel />}

        <button
          aria-label={t.settings}
          onClick={() => setPanel('settingsOpen', !settingsOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 11,
            padding: 11,
            border: '1px solid var(--line)',
            borderRadius: 12,
            background: 'var(--surface)',
            cursor: 'pointer',
            width: '100%',
            textAlign: 'left',
            fontFamily: "'Hanken Grotesk', sans-serif",
            color: 'var(--ink)',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: '#e7e1d4',
              flex: 'none',
            }}
          />
          <div className="side-user-info" style={{ lineHeight: 1.2, flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{displayName || t.guestLabel}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t.streakLabel(streak)}</div>
          </div>
          <div className="user-dots" style={{ color: 'var(--muted)', flex: 'none' }}>
            <svg width="15" height="15" viewBox="0 0 14 14" fill="currentColor">
              <circle cx="7" cy="3" r="1.3" />
              <circle cx="7" cy="7" r="1.3" />
              <circle cx="7" cy="11" r="1.3" />
            </svg>
          </div>
        </button>
      </div>
    </aside>
  )
}
