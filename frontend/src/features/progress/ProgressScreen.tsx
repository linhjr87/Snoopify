import { useT } from '../../i18n/useT'
import { Calendar } from './Calendar'
import { ReviewBars } from './ReviewBars'
import { MasteryLevels } from './MasteryLevels'
import { NeedsReview } from './NeedsReview'

export default function ProgressScreen() {
  const t = useT()
  return (
    <div style={{ animation: 'fadeUp .45s ease both' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>
          Tổng quan
        </div>
        <h1 style={{ margin: 0, fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 32, letterSpacing: '-0.01em' }}>
          {t.progressTitle}
        </h1>
      </div>

      {/* 4 stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 22 }}>
        <StatTile value="12"    label="ngày liên tục"  color="var(--clay, #a96440)" />
        <StatTile value="486"   label="thẻ đã học" />
        <StatTile value="88%"   label="độ chính xác"   color="var(--accent)" />
        <StatTile value="1.640" label="lượt ôn tổng" />
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
          <Calendar />
          <ReviewBars />
        </section>

        {/* Right: mastery + needs-review (340px) */}
        <div style={{ width: 340, flex: 'none', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <MasteryLevels />
          <NeedsReview />
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
