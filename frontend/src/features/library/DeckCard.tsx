export interface DeckCardProps { name: string; tag: string; meta: string; mastery: string; last: string; barW: string; needAttention?: boolean }
export function DeckCard({ name, tag, meta, mastery, last, barW, needAttention }: DeckCardProps) {
  const tagStyle: React.CSSProperties = {
    fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em',
    borderRadius: '6px', padding: '3px 8px', fontWeight: 600, flexShrink: 0,
    color: needAttention ? 'var(--rust)' : 'var(--muted)',
    background: needAttention ? '#f6e6e2' : 'var(--paper)',
  }
  const barStyle: React.CSSProperties = {
    width: barW, height: '100%',
    background: needAttention ? 'var(--rust)' : 'var(--accent)',
    borderRadius: '999px',
  }
  return (
    <div className="deck" style={{
      border: '1px solid var(--line)', borderRadius: '16px', background: 'var(--surface)',
      padding: '20px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(40,35,25,0.03)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ fontSize: '17px', fontWeight: 600 }}>{name}</div>
        <span style={tagStyle}>{tag}</span>
      </div>
      <div style={{ color: 'var(--muted)', fontSize: '14px', margin: '4px 0 16px' }}>{meta}</div>
      <div style={{ height: '7px', borderRadius: '999px', background: 'var(--track)', overflow: 'hidden' }}>
        <div style={barStyle} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{mastery}</span>
        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{last}</span>
      </div>
    </div>
  )
}
