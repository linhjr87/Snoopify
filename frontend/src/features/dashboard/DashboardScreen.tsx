import { useT } from '../../i18n/useT'
import { useProgressSummary } from './queries'
import { useWordOfDay } from './queries'
import { useRecentCards } from './queries'
import { TodaySession } from './TodaySession'
import { Streak } from './Streak'
import { QuickAdd } from './QuickAdd'
import { RecentlyAdded } from './RecentlyAdded'
import { WordOfDay } from './WordOfDay'
import { WeekProgress } from './WeekProgress'

export default function DashboardScreen() {
  const t = useT()
  const { data: summary } = useProgressSummary()
  const { data: word } = useWordOfDay()
  const { data: cards } = useRecentCards()

  return (
    <div style={{ animation: 'fadeUp .5s ease both' }}>
      {/* Greeting row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', marginBottom: '30px' }}>
        <div>
          <div style={{ fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: '6px' }}>Thứ Hai · 22 tháng 6</div>
          <h1 style={{ margin: 0, fontFamily: "'Newsreader',serif", fontWeight: 500, fontSize: '34px', letterSpacing: '-0.01em' }}>{t.greeting}</h1>
        </div>
        <div data-tour="search" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid var(--line)', borderRadius: '999px', padding: '8px 15px', background: 'var(--surface)', color: 'var(--muted)', fontSize: '14px', minWidth: '210px' }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="7" cy="7" r="4.5" /><path d="M10.5 10.5L14 14" /></svg>
          {t.searchPh}
        </div>
      </div>

      {/* Row 1: TodaySession + Streak */}
      <div style={{ display: 'flex', gap: '22px', marginBottom: '22px', flexWrap: 'wrap' }}>
        <TodaySession summary={summary ?? null} />
        <Streak summary={summary ?? null} />
      </div>

      {/* Quick Add */}
      <QuickAdd />

      {/* Row 2: RecentlyAdded + right column */}
      <div style={{ display: 'flex', gap: '22px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <RecentlyAdded cards={cards ?? []} />
        <div style={{ width: '330px', flex: 'none', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <WordOfDay word={word ?? null} />
          <WeekProgress summary={summary ?? null} />
        </div>
      </div>
    </div>
  )
}
