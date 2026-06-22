export interface PreviewData {
  word: string
  phonetic: string
  pos: string
  meaning: string
  example: string
  deck: string
  tags: string
}

export function CardPreview({ data }: { data: PreviewData }) {
  const word     = data.word     || 'resilient'
  const phonetic = data.phonetic || '/rɪˈzɪl.i.ənt/'
  const pos      = data.pos      || 'adj'
  const meaning  = data.meaning  || 'có khả năng phục hồi nhanh; kiên cường'
  const example  = data.example  || 'She is so resilient…'

  return (
    <section style={{
      border: '1px solid var(--line)', borderRadius: 18,
      background: 'var(--surface)', padding: 24,
      boxShadow: '0 1px 2px rgba(40,35,25,0.03)',
    }}>
      <div style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 14 }}>
        Xem trước
      </div>
      <div style={{ fontFamily: "'Newsreader', serif", fontSize: 32, fontWeight: 500, letterSpacing: '-0.01em' }}>
        {word}
      </div>
      <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--muted)', margin: '3px 0 10px' }}>
        {phonetic} · {pos}
      </div>
      <div style={{ fontSize: 15, color: 'var(--ink)' }}>
        {meaning}
      </div>
      <div style={{
        fontSize: 14, color: 'var(--muted)', fontStyle: 'italic',
        marginTop: 12, paddingLeft: 13, borderLeft: '2px solid var(--accent)',
      }}>
        {example}
      </div>
    </section>
  )
}
