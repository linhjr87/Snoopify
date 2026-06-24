import type { ProgressSummary } from '../../lib/api-types'

export function Streak({ summary }: { summary: ProgressSummary | null }) {
  const streak = summary?.streak ?? 0
  const bars = summary?.weekly_bars ?? []
  const todayIdx = (new Date().getDay() + 6) % 7 // Mon=0 .. Sun=6
  const chips = bars.map((b, i) => ({ label: b.label, filled: b.count > 0, today: i === todayIdx }))

  return (
    <section data-tour="streak" style={{ flex: 1, minWidth: '280px', border: '1px solid var(--line)', borderRadius: '18px', background: 'linear-gradient(165deg,#fdfaf2,var(--surface))', padding: '26px', boxShadow: '0 1px 2px rgba(40,35,25,0.03)', animation: 'fadeUp .6s ease both', animationDelay: '.12s' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>Chuỗi học</div>
        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'color-mix(in srgb, var(--clay) 16%, #fff)', color: 'var(--clay)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>◆</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '18px' }}>
        <div style={{ fontFamily: 'var(--num-font)', fontSize: '52px', fontWeight: 600, lineHeight: 1, color: 'var(--clay)' }}>{streak}</div>
        <div style={{ fontSize: '16px', color: 'var(--muted)' }}>ngày liên tục</div>
      </div>
      <div style={{ display: 'flex', gap: '7px', justifyContent: 'space-between' }}>
        {chips.map(({ label, filled, today }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={today
              ? { width: '26px', height: '26px', borderRadius: '7px', border: '1.5px dashed var(--accent,#2f5d4e)', background: 'var(--surface)' }
              : filled
                ? { width: '26px', height: '26px', borderRadius: '7px', background: 'var(--accent,#2f5d4e)' }
                : { width: '26px', height: '26px', borderRadius: '7px', background: 'var(--track)' }
            } />
            <div style={{ fontSize: '11px', color: today ? 'var(--accent,#2f5d4e)' : 'var(--muted)', marginTop: '5px', fontWeight: today ? 600 : undefined }}>{label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
