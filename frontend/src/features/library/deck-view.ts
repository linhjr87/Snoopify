import type { DeckOut } from '../../lib/api-types'
import type { DeckCardProps } from './DeckCard'

export function formatRelativeVi(iso: string | null): string {
  if (!iso) return 'chưa ôn'
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (days <= 0) return 'hôm nay'
  if (days === 1) return 'hôm qua'
  if (days < 7) return `${days} ngày trước`
  if (days < 30) return `${Math.floor(days / 7)} tuần trước`
  return `${Math.floor(days / 30)} tháng trước`
}

export function toDeckCard(d: DeckOut): DeckCardProps {
  const pct = Math.round(d.mastery_pct)
  const needAttention = d.count > 0 && pct < 40
  return {
    name: d.name,
    tag: needAttention ? 'cần chú ý' : (d.topic || 'chủ đề'),
    meta: `${d.count} thẻ · ${d.due_count} đến hạn`,
    mastery: `thành thạo ${pct}%`,
    last: formatRelativeVi(d.last_reviewed_at),
    barW: `${pct}%`,
    needAttention,
  }
}
