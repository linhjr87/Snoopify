import { NavLink } from 'react-router-dom'
import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import { Avatar } from '../ui/Avatar'
import { Icon } from '../ui/Icon'

const links = (t: ReturnType<typeof useT>) => [
  { to: '/', label: t.home }, { to: '/library', label: t.library },
  { to: '/review', label: t.review }, { to: '/add', label: t.add }, { to: '/progress', label: t.progress },
]
export function Sidebar() {
  const t = useT()
  const setPanel = useAppStore((s) => s.setPanel)
  return (
    <aside className="flex w-60 flex-col gap-4 border-r border-line bg-surface p-4">
      <div className="flex items-center gap-2 px-2 text-lg font-semibold text-ink">
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-white">S</span> Snoopify
      </div>
      <nav className="flex flex-col gap-1">
        {links(t).map((l) => (
          <NavLink key={l.to} to={l.to} end={l.to === '/'}
            className={({ isActive }) => `flex items-center gap-3 rounded-lg px-3 py-2 ${isActive ? 'bg-accent-soft text-accent font-semibold' : 'text-ink'}`}>
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex items-center justify-between">
        <Avatar name="Minh" streak={12} />
        <button aria-label={t.settings} onClick={() => setPanel('settingsOpen', true)} className="text-muted hover:text-ink"><Icon name="chevron" /></button>
      </div>
    </aside>
  )
}
