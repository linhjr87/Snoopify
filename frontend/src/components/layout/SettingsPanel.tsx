'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import { apiPost } from '../../lib/api'

export function SettingsPanel() {
  const t = useT()
  const router = useRouter()
  const { settingsOpen, confirmReset } = useAppStore((s) => ({
    settingsOpen: s.settingsOpen,
    confirmReset: s.confirmReset,
  }))
  const setPanel = useAppStore((s) => s.setPanel)
  const resetProgress = useAppStore((s) => s.resetProgress)
  const [resetError, setResetError] = useState(false)

  const handleLogout = async () => {
    try { await apiPost('/auth/logout') } catch { /* ignore */ }
    router.push('/login'); router.refresh()
  }

  const handleReset = async () => {
    setResetError(false)
    try {
      const res = await fetch('/api/progress/reset', { method: 'POST' })
      if (!res.ok) throw new Error(String(res.status))
      resetProgress()        // success: reset UI state + close panels
      router.refresh()       // re-run server fetches
    } catch {
      setResetError(true)    // keep the panel open and surface the failure
    }
  }

  if (!settingsOpen) return null

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 8px)',
        left: 0,
        right: 0,
        border: '1px solid var(--line)',
        borderRadius: 14,
        background: 'var(--surface)',
        boxShadow: '0 14px 34px -14px rgba(40,35,25,0.42)',
        padding: 8,
        zIndex: 50,
      }}
    >
      {/* Header */}
      <div
        style={{
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--muted)',
          padding: '6px 8px 8px',
        }}
      >
        {t.settings}
      </div>

      {/* Logout */}
      <div style={{ borderBottom: '1px solid var(--line)', paddingBottom: 8, marginBottom: 4 }}>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            width: '100%',
            border: 'none',
            background: 'transparent',
            color: 'var(--ink)',
            cursor: 'pointer',
            fontSize: 14,
            padding: '7px 8px',
            borderRadius: 8,
            textAlign: 'left',
            fontFamily: "'Hanken Grotesk', sans-serif",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5.5 12H2.5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h3" />
            <path d="M9.5 10l3-3-3-3" />
            <path d="M12.5 7H5.5" />
          </svg>
          {t.logoutBtn}
        </button>
      </div>

      {/* Reset section */}
      <div style={{ paddingTop: 4 }}>
        {!confirmReset ? (
          <button
            onClick={() => setPanel('confirmReset', true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              width: '100%',
              border: 'none',
              background: 'transparent',
              color: 'var(--rust)',
              cursor: 'pointer',
              fontSize: 14,
              padding: '7px 8px',
              borderRadius: 8,
              textAlign: 'left',
              fontFamily: "'Hanken Grotesk', sans-serif",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 3.5 13 3.5" />
              <path d="M5 3.5V2.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1" />
              <path d="M2.5 3.5l.7 8.1a1 1 0 0 0 1 .9h5.6a1 1 0 0 0 1-.9l.7-8.1" />
            </svg>
            {t.resetProgress}
          </button>
        ) : (
          <div style={{ padding: '4px 8px' }}>
            <div style={{ fontSize: 13, color: 'var(--ink)', marginBottom: 10 }}>{t.resetConfirm}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleReset}
                style={{
                  flex: 1,
                  border: 'none',
                  borderRadius: 8,
                  background: 'var(--rust)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '7px 10px',
                  fontFamily: "'Hanken Grotesk', sans-serif",
                }}
              >
                {t.deleteAll}
              </button>
              <button
                onClick={() => setPanel('confirmReset', false)}
                style={{
                  flex: 1,
                  border: '1px solid var(--line)',
                  borderRadius: 8,
                  background: 'transparent',
                  color: 'var(--ink)',
                  cursor: 'pointer',
                  fontSize: 13,
                  padding: '7px 10px',
                  fontFamily: "'Hanken Grotesk', sans-serif",
                }}
              >
                {t.cancel}
              </button>
            </div>
            {resetError && (
              <div style={{ color: 'var(--rust)', fontSize: 12, marginTop: 8 }}>{t.resetError}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
