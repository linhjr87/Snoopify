import { useAppStore } from '../../store/useAppStore'
import { useT } from '../../i18n/useT'
import { SearchInput } from '../ui/SearchInput'
import { Icon } from '../ui/Icon'
import { NotificationsMenu } from './NotificationsMenu'
import { LangMenu } from './LangMenu'
import { useState } from 'react'
export function Topbar() {
  const t = useT()
  const setPanel = useAppStore((s) => s.setPanel)
  const flag = useAppStore((s) => (s.lang === 'en' ? '🇬🇧' : '🇻🇳'))
  const [q, setQ] = useState('')
  return (
    <header className="flex items-center gap-4 border-b border-line bg-paper px-6 py-3">
      <div className="text-lg font-semibold text-ink">{t.greeting}</div>
      <div className="ml-auto w-72"><SearchInput value={q} onChange={setQ} placeholder={t.searchPh} /></div>
      <div className="relative">
        <button aria-label={t.notif} onClick={() => setPanel('notifOpen', true)} className="text-muted hover:text-ink"><Icon name="bell" /></button>
        <NotificationsMenu />
      </div>
      <div className="relative">
        <button aria-label={t.language} onClick={() => setPanel('langMenuOpen', true)} className="text-base">{flag}</button>
        <LangMenu />
      </div>
    </header>
  )
}
