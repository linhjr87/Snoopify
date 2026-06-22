import type { ReactNode } from 'react'
export function TagPill({ tone = 'muted', children }: { tone?: 'muted' | 'rust'; children: ReactNode }) {
  const cls = tone === 'rust' ? 'text-rust bg-[#f6e6e2]' : 'text-muted bg-paper'
  return <span className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls}`}>{children}</span>
}
