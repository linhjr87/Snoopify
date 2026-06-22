import type { ReactNode } from 'react'
import { Icon } from './Icon'
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-surface p-5 border border-line" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-base font-semibold text-ink">{title}</div>
          <button aria-label="close" onClick={onClose} className="text-muted hover:text-ink"><Icon name="x" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
