'use client'
import { useT } from '../../i18n/useT'
import { Calendar } from './Calendar'
import { ReviewBars } from './ReviewBars'
import { MasteryLevels } from './MasteryLevels'
import { NeedsReview } from './NeedsReview'
import type { ProgressSummary, HeatmapOut, NeedsReviewItem } from '../../lib/api-types'

export default function ProgressScreen({ summary, heatmap, needsReview }: {
  summary: ProgressSummary | null
  heatmap: HeatmapOut | null
  needsReview: NeedsReviewItem[]
}) {
  const t = useT()
  const s = summary
  return (
    <div style={{ animation: 'fadeUp .45s ease both' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
          {t.overviewLabel}
        </div>
        <h1 style={{ margin: 0, fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 32, letterSpacing: '-0.01em' }}>
          {t.progressTitle}
        </h1>
      </div>

      {/* 4 stat tiles (API-backed) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 22 }}>
        <StatTile value={String(s?.streak ?? 0)} label={t.consecutiveDays} color="var(--clay, #a96440)" />
        <StatTile value={String(s?.mastery.proficient ?? 0)} label={t.masteredLabel} color="var(--accent)" />
        <StatTile value={String(s?.due_total ?? 0)} label={t.dueCardsLabel} />
        <StatTile value={String(s?.reviews_today ?? 0)} label={t.reviewedTodayLabel} />
      </div>

      {/* Two-column body */}
      <div style={{ display: 'flex', gap: 22, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        {/* Left: calendar + bars (flex:1.5) */}
        <section style={{
          flex: '1.5', minWidth: 420,
          border: '1px solid var(--line)', borderRadius: 18,
          background: 'var(--surface)', padding: 24,
          boxShadow: '0 1px 2px rgba(40,35,25,0.03)',
        }}>
          <Calendar heatmap={heatmap} />
          <ReviewBars summary={summary} />
        </section>

        {/* Right: mastery + needs-review (340px) */}
        <div style={{ width: 340, flex: 'none', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <MasteryLevels summary={summary} />
          <NeedsReview items={needsReview} />
        </div>
      </div>
    </div>
  )
}

function StatTile({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <section style={{
      border: '1px solid var(--line)', borderRadius: 16,
      background: 'var(--surface)', padding: 20,
      boxShadow: '0 1px 2px rgba(40,35,25,0.03)',
    }}>
      <div style={{
        fontFamily: "'Newsreader', serif", fontSize: 40,
        fontWeight: 600, lineHeight: 1, color: color ?? 'var(--ink)',
      }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>{label}</div>
    </section>
  )
}
