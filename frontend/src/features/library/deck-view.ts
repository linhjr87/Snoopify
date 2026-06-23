import type { DeckOut } from '../../lib/api-types'
import type { DeckCardProps } from './DeckCard'
import { formatRelativeVi } from '../../lib/format'

export { formatRelativeVi } from '../../lib/format'

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
