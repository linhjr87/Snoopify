'use client'
import { useRouter } from 'next/navigation'
import { useT } from '../../i18n/useT'
import type { ProgressSummary } from '../../lib/api-types'

const CIRC = 2 * Math.PI * 60 // r=60

export function TodaySession({ summary }: { summary: ProgressSummary | null }) {
  const t = useT()
  const router = useRouter()
  const reviewed = summary?.reviews_today ?? 0
  const due = summary?.due_total ?? 0
  const target = reviewed + due
  const offset = target > 0 ? CIRC * (1 - reviewed / target) : CIRC
  const isError = false

  return (
    <section style={{ flex: '1.7', minWidth: '420px', border: '1px solid var(--line)', borderRadius: '18px', background: 'var(--surface)', padding: '30px', display: 'flex', gap: '32px', alignItems: 'center', boxShadow: '0 1px 2px rgba(40,35,25,0.03)', animation: 'fadeUp .6s ease both', animationDelay: '.05s' }}>
      <div style={{ position: 'relative', width: '144px', height: '144px', flex: 'none' }}>
        <svg width="144" height="144" viewBox="0 0 144 144">
          <circle cx="72" cy="72" r="60" fill="none" stroke="var(--line,#e8e3d8)" strokeWidth="11" />
          <circle cx="72" cy="72" r="60" fill="none" stroke="var(--accent,#2f5d4e)" strokeWidth="11" strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={offset} transform="rotate(-90 72 72)" />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          {isError && !summary ? (
            <div style={{ fontSize: '12px', color: 'var(--rust)', textAlign: 'center', padding: '0 8px' }}>Lỗi tải</div>
          ) : (
            <>
              <div style={{ fontFamily: 'var(--num-font)', fontSize: '34px', fontWeight: 600, lineHeight: 1 }}>{reviewed}<span style={{ color: 'var(--muted)', fontSize: '20px' }}>/{target}</span></div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '3px' }}>đã ôn</div>
            </>
          )}
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '7px' }}>{t.todaySession}</div>
        <div style={{ fontFamily: "'Newsreader',serif", fontSize: '27px', fontWeight: 500, letterSpacing: '-0.01em', marginBottom: '20px' }}>Còn {due} thẻ đến hạn</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button
            onClick={() => router.push('/review')}
            style={{ border: 'none', borderRadius: '11px', background: 'var(--accent,#2f5d4e)', color: '#fff', padding: '13px 26px', fontFamily: "'Hanken Grotesk',sans-serif", fontWeight: 600, fontSize: '15px', cursor: 'pointer', transition: 'transform .18s ease, box-shadow .18s ease', display: 'flex', alignItems: 'center', gap: '9px' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3 2.2v9.6a.5.5 0 0 0 .76.43l7.7-4.8a.5.5 0 0 0 0-.86l-7.7-4.8A.5.5 0 0 0 3 2.2z" /></svg>
            {t.startReview}
          </button>
        </div>
      </div>
    </section>
  )
}
