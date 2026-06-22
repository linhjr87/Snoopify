import { Icon } from './Icon'
export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-sm">
      <span className="text-muted"><Icon name="search" size={16} /></span>
      <input className="w-full bg-transparent outline-none text-ink placeholder:text-muted"
        value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
