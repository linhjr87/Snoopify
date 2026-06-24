'use client'

import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'

const dotColors = ['var(--rust)', 'var(--clay,#a96440)', 'var(--accent,#2f5d4e)']

export function NotificationsMenu() {
  const open = useAppStore((s) => s.notifOpen)
  const setPanel = useAppStore((s) => s.setPanel)
  const t = useT()

  if (!open) return null

  const items = [
    { msg: t.n1, time: t.n1t },
    { msg: t.n2, time: t.n2t },
    { msg: t.n3, time: t.n3t },
  ]

  return (
    <div
      style={{
        position: 'absolute',
        top: 'calc(100% + 8px)',
        right: 0,
        width: 300,
        border: '1px solid var(--line)',
        borderRadius: 14,
        background: 'var(--surface)',
        boxShadow: '0 18px 40px -16px rgba(20,16,10,0.45)',
        padding: 8,
        zIndex: 70,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 8px 10px',
        }}
      >
        <span
          style={{
            fontSize: 12,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--muted)',
          }}
        >
          {t.notif}
        </span>
        <span
          onClick={() => setPanel('notifOpen', false)}
          style={{ fontSize: 11, color: 'var(--accent,#2f5d4e)', cursor: 'pointer' }}
        >
          {t.markRead}
        </span>
      </div>

      {items.map((item, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: 10,
            padding: '10px 8px',
            borderTop: '1px solid var(--line)',
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: dotColors[i],
              flex: 'none',
              marginTop: 5,
              display: 'inline-block',
            }}
          />
          <div>
            <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.4 }}>{item.msg}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{item.time}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
