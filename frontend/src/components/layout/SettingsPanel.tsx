import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'

export function SettingsPanel() {
  const t = useT()
  const { settingsOpen, dark, confirmReset } = useAppStore((s) => ({
    settingsOpen: s.settingsOpen,
    dark: s.dark,
    confirmReset: s.confirmReset,
  }))
  const setPanel = useAppStore((s) => s.setPanel)
  const toggleDark = useAppStore((s) => s.toggleDark)
  const resetProgress = useAppStore((s) => s.resetProgress)

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

      {/* Dark mode row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '6px 8px 10px',
        }}
      >
        <span style={{ fontSize: 14, color: 'var(--ink)' }}>{t.darkMode}</span>
        <button
          onClick={() => toggleDark()}
          aria-label={t.darkMode}
          style={{
            position: 'relative',
            width: 44,
            height: 22,
            borderRadius: 999,
            background: dark ? 'var(--accent)' : '#cfcabd',
            border: 'none',
            cursor: 'pointer',
            flex: 'none',
            padding: 0,
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 2,
              left: dark ? 22 : 2,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#fff',
              transition: 'left .2s ease',
            }}
          />
        </button>
      </div>

      {/* Reset section */}
      <div style={{ borderTop: '1px solid var(--line)', paddingTop: 8 }}>
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
                onClick={() => resetProgress()}
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
          </div>
        )}
      </div>
    </div>
  )
}
