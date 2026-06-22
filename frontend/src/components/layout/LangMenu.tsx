import { useAppStore } from '../../store/useAppStore'
export function LangMenu() {
  const open = useAppStore((s) => s.langMenuOpen)
  const lang = useAppStore((s) => s.lang)
  const setLang = useAppStore((s) => s.setLang)
  if (!open) return null
  return (
    <div className="absolute right-0 top-12 z-40 w-40 rounded-xl border border-line bg-surface p-1 shadow-lg">
      <button onClick={() => setLang('vn')} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${lang !== 'en' ? 'bg-accent-soft text-accent font-semibold' : 'text-ink'}`}>🇻🇳 Tiếng Việt</button>
      <button onClick={() => setLang('en')} className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm ${lang === 'en' ? 'bg-accent-soft text-accent font-semibold' : 'text-ink'}`}>🇬🇧 English</button>
    </div>
  )
}
