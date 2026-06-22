import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
export function NotificationsMenu() {
  const open = useAppStore((s) => s.notifOpen)
  const setPanel = useAppStore((s) => s.setPanel)
  const t = useT()
  if (!open) return null
  const items = [[t.n1, t.n1t], [t.n2, t.n2t], [t.n3, t.n3t]]
  return (
    <div className="absolute right-0 top-12 z-40 w-72 rounded-xl border border-line bg-surface p-3 shadow-lg">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">{t.notif}</span>
        <button className="text-xs text-accent" onClick={() => setPanel('notifOpen', false)}>{t.markRead}</button>
      </div>
      {items.map(([msg, when], i) => (
        <div key={i} className="border-t border-line py-2 first:border-t-0">
          <div className="text-sm text-ink">{msg}</div>
          <div className="text-xs text-muted">{when}</div>
        </div>
      ))}
    </div>
  )
}
