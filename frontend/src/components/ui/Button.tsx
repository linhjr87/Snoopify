import type { ReactNode } from 'react'
type Variant = 'primary' | 'ghost' | 'danger'
const styles: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:opacity-90',
  ghost: 'bg-surface text-ink border border-line hover:bg-paper',
  danger: 'bg-rust text-white hover:opacity-90',
}
export function Button({ variant = 'primary', disabled, onClick, children, className = '' }:
  { variant?: Variant; disabled?: boolean; onClick?: () => void; children: ReactNode; className?: string }) {
  return <button disabled={disabled} onClick={onClick}
    className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}>{children}</button>
}
