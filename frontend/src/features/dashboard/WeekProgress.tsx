export function WeekProgress() {
  return (
    <>
      {/* Stats row: 486 / 213 */}
      <div style={{ display: 'flex', gap: '14px', animation: 'fadeUp .6s ease both', animationDelay: '.36s' }}>
        <section style={{ flex: 1, border: '1px solid var(--line)', borderRadius: '16px', background: 'var(--surface)', padding: '18px', textAlign: 'center', boxShadow: '0 1px 2px rgba(40,35,25,0.03)' }}>
          <div style={{ fontFamily: 'var(--num-font)', fontSize: '34px', fontWeight: 600, lineHeight: 1 }}>486</div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '5px' }}>thẻ đã học</div>
        </section>
        <section style={{ flex: 1, border: '1px solid var(--line)', borderRadius: '16px', background: 'var(--surface)', padding: '18px', textAlign: 'center', boxShadow: '0 1px 2px rgba(40,35,25,0.03)' }}>
          <div style={{ fontFamily: 'var(--num-font)', fontSize: '34px', fontWeight: 600, lineHeight: 1, color: 'var(--accent,#2f5d4e)' }}>213</div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '5px' }}>đã thành thạo</div>
        </section>
      </div>

      {/* Week progress bar */}
      <section style={{ border: '1px solid var(--line)', borderRadius: '16px', background: 'var(--surface)', padding: '18px 20px', animation: 'fadeUp .6s ease both', animationDelay: '.42s', boxShadow: '0 1px 2px rgba(40,35,25,0.03)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600 }}>Tiến độ tuần</div>
          <div style={{ fontSize: '13px', color: 'var(--muted)' }}>68%</div>
        </div>
        <div style={{ height: '8px', borderRadius: '999px', background: 'var(--track)', overflow: 'hidden' }}>
          <div style={{ width: '68%', height: '100%', background: 'var(--accent,#2f5d4e)', borderRadius: '999px' }} />
        </div>
        <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '9px' }}>Còn 2 ngày để đạt mục tiêu 5 buổi/tuần</div>
      </section>
    </>
  )
}
