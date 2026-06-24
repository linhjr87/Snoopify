'use client'
import { useT } from '../../i18n/useT'

export function DashboardHeader() {
  const t = useT()
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', marginBottom: '30px' }}>
      <div>
        <div style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px' }}>Thứ Hai · 22 tháng 6</div>
        <h1 style={{ margin: 0, fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: '34px', letterSpacing: '-0.01em' }}>{t.greeting}</h1>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--line)', borderRadius: '999px', padding: '8px 15px', background: 'var(--surface)', color: 'var(--muted)', fontSize: '14px', minWidth: '210px' }}>
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></svg>
        {t.searchPh}
      </div>
    </div>
  )
}
