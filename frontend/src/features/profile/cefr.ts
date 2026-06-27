import type { Lang } from '../../store/types'

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

const DESCRIPTORS: Record<string, { vn: string; en: string }> = {
  A1: { vn: 'Sơ cấp', en: 'Beginner' },
  A2: { vn: 'Sơ trung cấp', en: 'Elementary' },
  B1: { vn: 'Trung cấp', en: 'Intermediate' },
  B2: { vn: 'Trung cao cấp', en: 'Upper-Intermediate' },
  C1: { vn: 'Cao cấp', en: 'Advanced' },
  C2: { vn: 'Thành thạo', en: 'Proficient' },
}

// "B1" -> "Trung cấp · B1" (vn) / "Intermediate · B1" (en)
export function cefrLabel(code: string, lang: Lang): string {
  const d = DESCRIPTORS[code]
  return d ? `${lang === 'en' ? d.en : d.vn} · ${code}` : code
}
