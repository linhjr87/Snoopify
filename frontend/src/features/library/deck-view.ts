import type { DeckOut } from '../../lib/api-types'
import type { DeckCardProps } from './DeckCard'
import type { Lang } from '../../store/types'
import { dict } from '../../i18n/dictionary'
import { formatRelative } from '../../lib/format'

export { formatRelativeVi } from '../../lib/format'

export function toDeckCard(d: DeckOut, lang: Lang = 'vn'): DeckCardProps {
  const t = dict[lang]
  const pct = Math.round(d.mastery_pct)
  const needAttention = d.count > 0 && pct < 40
  return {
    name: d.name,
    tag: needAttention ? t.needsAttentionTag : (d.topic || t.topicLabel),
    meta: t.deckMeta(d.count, d.due_count),
    mastery: t.masteryPct(pct),
    last: formatRelative(d.last_reviewed_at, lang),
    barW: `${pct}%`,
    needAttention,
  }
}
