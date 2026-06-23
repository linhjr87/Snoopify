import { useWordOfDay } from './queries'

export function WordOfDay() {
  const { data } = useWordOfDay()
  const phon = data ? [data.phonetic, data.pos].filter(Boolean).join(' · ') : ''
  return (
    <section style={{ border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--surface)', padding: '24px', boxShadow: '0 1px 2px rgba(40,35,25,0.03)', animation: 'fadeUp .6s ease both', animationDelay: '.3s' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>Từ của ngày</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--accent,#2f5d4e)', border: '1px solid var(--accent-soft,#e9f0ec)', background: 'var(--accent-soft,#e9f0ec)', borderRadius: '999px', padding: '4px 10px', cursor: 'pointer' }}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor"><path d="M3 2v8l6-4z" /></svg>
          Nghe
        </div>
      </div>
      {data ? (
        <>
          <div style={{ fontFamily: "'Newsreader',serif", fontSize: '34px', fontWeight: 500, letterSpacing: '-0.01em' }}>{data.word}</div>
          <div style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--muted)', margin: '3px 0 10px' }}>{phon}</div>
          <div style={{ fontSize: '15px', color: 'var(--ink)' }}>{data.meaning}</div>
          <div style={{ fontSize: '14px', color: 'var(--muted)', fontStyle: 'italic', marginTop: '12px', paddingLeft: '13px', borderLeft: '2px solid var(--accent,#2f5d4e)' }}>{data.example}</div>
        </>
      ) : (
        <div style={{ fontSize: '14px', color: 'var(--muted)' }}>Chưa có thẻ nào — thêm thẻ để bắt đầu.</div>
      )}
    </section>
  )
}
