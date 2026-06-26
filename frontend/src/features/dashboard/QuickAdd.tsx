'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useT } from '../../i18n/useT'

export function QuickAdd() {
  const t = useT()
  const TYPES = [t.typeVocab, t.typePhrase, t.typeGrammar, t.typeMistake]
  const [selectedIdx, setSelectedIdx] = useState(0)
  const router = useRouter()

  return (
    <section style={{ border: '1px solid var(--line)', borderRadius: '14px', background: 'var(--surface)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '22px', flexWrap: 'wrap', boxShadow: '0 1px 2px rgba(40,35,25,0.03)', animation: 'fadeUp .6s ease both', animationDelay: '.18s' }}>
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--accent,#2f5d4e)" strokeWidth="1.8" strokeLinecap="round"><path d="M9 3.5v11M3.5 9h11" /></svg>
      <div style={{ flex: 1, minWidth: '200px', color: 'var(--muted)', fontSize: '15px' }}>{t.quickAddPlaceholder}</div>
      <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
        {TYPES.map((type, i) => (
          <span
            key={i}
            onClick={() => setSelectedIdx(i)}
            style={selectedIdx === i
              ? { fontSize: '13px', border: '1px solid var(--accent,#2f5d4e)', color: 'var(--accent,#2f5d4e)', borderRadius: '999px', padding: '4px 12px', background: 'var(--accent-soft,#e9f0ec)', cursor: 'pointer' }
              : { fontSize: '13px', border: '1px solid var(--line)', color: 'var(--muted)', borderRadius: '999px', padding: '4px 12px', cursor: 'pointer' }
            }
          >
            {type}
          </span>
        ))}
      </div>
      <button
        onClick={() => router.push('/add')}
        style={{ border: '1px solid var(--line)', borderRadius: '9px', background: 'var(--surface)', padding: '8px 16px', fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: '14px', cursor: 'pointer', transition: 'background .15s ease' }}
      >
        {t.saveCta}
      </button>
    </section>
  )
}
