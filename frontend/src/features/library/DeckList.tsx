import { DeckCard, type DeckCardProps } from './DeckCard'
import { useAppStore } from '../../store/useAppStore'

interface ImportedDeckVM { name: string; meta: string }

function ImportedDeckCard({ name, meta }: ImportedDeckVM) {
  return (
    <div className="deck" style={{
      border: '1px solid var(--accent)', borderRadius: '16px', background: 'var(--surface)',
      padding: '20px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(40,35,25,0.03)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ fontSize: '17px', fontWeight: 600 }}>{name}</div>
        <span style={{
          fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em',
          borderRadius: '6px', padding: '3px 8px', fontWeight: 600,
          color: 'var(--accent)', background: 'var(--accent-soft)',
        }}>đã nhập</span>
      </div>
      <div style={{ color: 'var(--muted)', fontSize: '14px', margin: '4px 0 16px' }}>{meta}</div>
      <div style={{ height: '7px', borderRadius: '999px', background: 'var(--track)', overflow: 'hidden' }}>
        <div style={{ width: '0%', height: '100%', background: 'var(--accent)', borderRadius: '999px' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '8px' }}>
        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>mới · chưa ôn</span>
        <span style={{ fontSize: '12px', color: 'var(--muted)' }}>vừa nhập</span>
      </div>
    </div>
  )
}

function NewDeckTile({ onClick }: { onClick?: () => void }) {
  return (
    <div className="deck" onClick={onClick} style={{
      border: '1.5px dashed var(--line)', borderRadius: '16px', background: 'transparent',
      padding: '20px', cursor: 'pointer', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '8px',
      color: 'var(--muted)', minHeight: '138px',
    }}>
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M11 4.5v13M4.5 11h13" />
      </svg>
      <div style={{ fontSize: '14px' }}>Tạo bộ thẻ mới</div>
    </div>
  )
}

export function DeckList({ decks }: { decks: DeckCardProps[] }) {
  const importedDecks = useAppStore((s) => s.importedDecks)
  const importedVM = importedDecks.map((d) => ({
    name: d.name,
    meta: `${d.count} thẻ` + (d.topic ? ` · ${d.topic}` : ''),
  }))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '18px' }}>
      {decks.map((d, i) => <DeckCard key={d.name + i} {...d} />)}
      {importedVM.map((d, i) => <ImportedDeckCard key={d.name + i} {...d} />)}
      <NewDeckTile />
    </div>
  )
}
