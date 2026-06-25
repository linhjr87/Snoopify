import type { Lang } from '../store/types'

export function formatRelativeVi(iso: string | null): string {
  if (!iso) return 'chưa ôn'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'hôm nay'
  if (days === 1) return 'hôm qua'
  if (days < 7) return `${days} ngày trước`
  if (days < 30) return `${Math.floor(days / 7)} tuần trước`
  return `${Math.floor(days / 30)} tháng trước`
}

export function formatRelativeEn(iso: string | null): string {
  if (!iso) return 'not reviewed yet'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days} days ago`
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`
  return `${Math.floor(days / 30)} months ago`
}

export function formatRelative(iso: string | null, lang: Lang): string {
  return lang === 'en' ? formatRelativeEn(iso) : formatRelativeVi(iso)
}

const WEEKDAYS_VN = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']
const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function formatHeaderDate(lang: Lang, date: Date = new Date()): string {
  if (lang === 'en') return `${WEEKDAYS_EN[date.getDay()]} · ${MONTHS_EN[date.getMonth()]} ${date.getDate()}`
  return `${WEEKDAYS_VN[date.getDay()]} · ${date.getDate()} tháng ${date.getMonth() + 1}`
}

// Backend always sends these fixed short codes (Mon..Sun) regardless of UI language.
const WEEKDAY_CODES_EN: Record<string, string> = { T2: 'Mon', T3: 'Tue', T4: 'Wed', T5: 'Thu', T6: 'Fri', T7: 'Sat', CN: 'Sun' }

export function weekdayLabel(code: string, lang: Lang): string {
  return lang === 'en' ? (WEEKDAY_CODES_EN[code] ?? code) : code
}
