'use client'

import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'

export function ChatPanel() {
  const t = useT()
  const chatOpen = useAppStore((s) => s.chatOpen)
  const toggleChat = useAppStore((s) => s.toggleChat)

  if (!chatOpen) {
    return (
      <button
        onClick={toggleChat}
        aria-label="open AI chat"
        className="cta"
        style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 75, width: 56, height: 56, borderRadius: '50%', background: 'var(--accent)', color: '#fff', border: 'none', boxShadow: '0 12px 26px -8px var(--accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11.5a7.5 7.5 0 0 1-10.8 6.7L4 19.5l1.3-4A7.5 7.5 0 1 1 20 11.5z" /><path d="M8.5 11h7M8.5 8.5h4" /></svg>
      </button>
    )
  }

  return (
    <aside
      aria-label="AI assistant"
      style={{ position: 'fixed', top: 0, right: 0, height: '100vh', width: 368, maxWidth: '100vw', background: 'var(--surface)', borderLeft: '1px solid var(--line)', boxShadow: '-18px 0 44px -28px rgba(20,16,10,0.5)', zIndex: 90, display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '18px 18px 15px', borderBottom: '1px solid var(--line)', flex: 'none' }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'var(--accent)', color: '#fff', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2.5l1.5 3.6 3.9.3-3 2.5 1 3.8L10 11.2 6.6 12.7l1-3.8-3-2.5 3.9-.3z" /></svg>
        </div>
        <div style={{ flex: 1, lineHeight: 1.25 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{t.aiTitle}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t.aiSub}</div>
        </div>
        <button onClick={toggleChat} aria-label="close chat" style={{ border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', borderRadius: 8 }}>
          <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M4 4l8 8M12 4l-8 8" /></svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ alignSelf: 'flex-start', maxWidth: '85%', padding: '11px 15px', borderRadius: '16px 16px 16px 5px', background: 'var(--accent-soft)', color: 'var(--ink)', fontSize: 14, lineHeight: 1.5 }}>
          {t.aiGreeting}
        </div>
      </div>

      <div style={{ padding: '13px 14px 16px', borderTop: '1px solid var(--line)', flex: 'none' }}>
        <div style={{ display: 'flex', gap: 9, alignItems: 'flex-end' }}>
          <input className="field" disabled aria-label="chat message" placeholder={t.aiComingSoon} style={{ flex: 1, borderRadius: 12, opacity: 0.6, cursor: 'not-allowed' }} />
          <button disabled aria-label="send" style={{ flex: 'none', width: 42, height: 42, borderRadius: 12, border: 'none', background: 'var(--accent)', color: '#fff', opacity: 0.5, cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M15.5 2.5L8 10M15.5 2.5l-4.7 13-2.8-5.5L2.5 7.2z" /></svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
