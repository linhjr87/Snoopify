'use client'
import { useRouter } from 'next/navigation'
import type { NeedsReviewItem } from '../../lib/api-types'

export function NeedsReview({ items }: { items: NeedsReviewItem[] }) {
  const router = useRouter()
  return (
    <section style={{ border: '1px solid var(--rust)', borderRadius: 18, background: 'var(--surface)', padding: 22, boxShadow: '0 1px 2px rgba(40,35,25,0.03)' }}>
      <h2 style={{ margin: '0 0 12px', fontFamily: "'Newsreader', serif", fontWeight: 500, fontSize: 18, color: 'var(--rust)' }}>
        Cần ôn gấp
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 15 }}>
        {items.length === 0 && <span style={{ color: 'var(--muted)', fontSize: 14 }}>Chưa có thẻ nào cần ôn gấp.</span>}
        {items.map((n) => (
          <div key={n.card_id} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--ink)' }}>{n.word}</span>
            <span style={{ color: 'var(--rust)', fontSize: 13 }}>sai {n.lapses}×</span>
          </div>
        ))}
      </div>
      <button
        onClick={() => router.push('/review')}
        style={{ marginTop: 16, width: '100%', border: 'none', borderRadius: 11, background: 'var(--rust)', color: '#fff', padding: 11, fontFamily: "'Hanken Grotesk', sans-serif", fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'transform .18s ease, box-shadow .18s ease' }}
        className="cta"
      >
        Ôn ngay nhóm này
      </button>
    </section>
  )
}
