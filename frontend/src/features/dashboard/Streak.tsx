// Streak chip data from export: T2-T5 filled (accent), T6-T7 track, CN dashed border
const CHIPS = [
  { label: 'T2', filled: true, today: false },
  { label: 'T3', filled: true, today: false },
  { label: 'T4', filled: true, today: false },
  { label: 'T5', filled: true, today: false },
  { label: 'T6', filled: false, today: false },
  { label: 'T7', filled: false, today: false },
  { label: 'CN', filled: false, today: true },
]

export function Streak() {
  return (
    <section style={{ flex: 1, minWidth: '280px', border: '1px solid var(--line)', borderRadius: '18px', background: 'linear-gradient(165deg,#fdfaf2,var(--surface))', padding: '26px', boxShadow: '0 1px 2px rgba(40,35,25,0.03)', animation: 'fadeUp .6s ease both', animationDelay: '.12s' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>Chuỗi học</div>
        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'color-mix(in srgb, var(--clay) 16%, #fff)', color: 'var(--clay)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>◆</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '18px' }}>
        <div style={{ fontFamily: 'var(--num-font)', fontSize: '52px', fontWeight: 600, lineHeight: 1, color: 'var(--clay)' }}>12</div>
        <div style={{ fontSize: '16px', color: 'var(--muted)' }}>ngày liên tục</div>
      </div>
      <div style={{ display: 'flex', gap: '7px', justifyContent: 'space-between' }}>
        {CHIPS.map(({ label, filled, today }) => (
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
