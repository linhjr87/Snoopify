import { useAppStore } from '../../store/useAppStore'

export function LangMenu() {
  const open = useAppStore((s) => s.langMenuOpen)
  const lang = useAppStore((s) => s.lang)
  const setLang = useAppStore((s) => s.setLang)

  if (!open) return null

  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        width: 184,
        border: '1px solid var(--line)',
        borderRadius: 12,
        background: 'var(--surface)',
        boxShadow: '0 16px 36px -16px rgba(20,16,10,0.4)',
        padding: 6,
        zIndex: 70,
      }}
    >
      <button
        onClick={() => setLang('vn')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          border: 'none',
          borderRadius: 8,
          padding: '9px 10px',
          cursor: 'pointer',
          fontFamily: "'Hanken Grotesk', sans-serif",
          fontSize: 14,
          textAlign: 'left',
          background: lang !== 'en' ? 'var(--accent-soft)' : 'transparent',
          color: lang !== 'en' ? 'var(--accent)' : 'var(--ink)',
          fontWeight: lang !== 'en' ? 600 : 400,
        }}
      >
        <span style={{ fontSize: 18 }}>🇻🇳</span> Tiếng Việt
      </button>
      <button
        onClick={() => setLang('en')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          width: '100%',
          border: 'none',
          borderRadius: 8,
          padding: '9px 10px',
          cursor: 'pointer',
          fontFamily: "'Hanken Grotesk', sans-serif",
          fontSize: 14,
          textAlign: 'left',
          background: lang === 'en' ? 'var(--accent-soft)' : 'transparent',
          color: lang === 'en' ? 'var(--accent)' : 'var(--ink)',
          fontWeight: lang === 'en' ? 600 : 400,
        }}
      >
        <span style={{ fontSize: 18 }}>🇬🇧</span> English
      </button>
    </div>
  )
}
