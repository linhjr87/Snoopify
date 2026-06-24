'use client'

import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { applyTheme } from '../theme/tokens'

export function Providers({ children }: { children: React.ReactNode }) {
  const dark = useAppStore((state) => state.dark)

  useEffect(() => {
    applyTheme(dark)
  }, [dark])

  return <>{children}</>
}
