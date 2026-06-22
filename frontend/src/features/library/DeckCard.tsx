import { Card } from '../../components/ui/Card'
import { TagPill } from '../../components/ui/TagPill'
import { ProgressBar } from '../../components/ui/ProgressBar'
export interface DeckCardProps { name: string; tag: string; meta: string; mastery: string; last: string; barW: string; needAttention?: boolean }
export function DeckCard({ name, tag, meta, mastery, last, barW, needAttention }: DeckCardProps) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-ink">{name}</div>
        <TagPill tone={needAttention ? 'rust' : 'muted'}>{tag}</TagPill>
      </div>
      <div className="mt-1 text-sm text-muted">{meta}</div>
      <div className="mt-3"><ProgressBar value={parseInt(barW)} tone={needAttention ? 'rust' : 'accent'} /></div>
      <div className="mt-2 flex justify-between text-xs text-muted"><span>{mastery}</span><span>{last}</span></div>
    </Card>
  )
}
