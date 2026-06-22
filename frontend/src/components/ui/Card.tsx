import type { ElementType, ReactNode } from 'react'
export function Card({ as: As = 'div' as ElementType, className = '', children }: { as?: ElementType; className?: string; children: ReactNode }) {
  return <As className={`rounded-2xl bg-surface border border-line ${className}`}>{children}</As>
}
