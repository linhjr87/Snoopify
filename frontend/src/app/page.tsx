import { apiFetch } from '../lib/api'
import type { ProgressSummary, WordOfDayOut, CardOut } from '../lib/api-types'
import { TodaySession } from '../features/dashboard/TodaySession'
import { Streak } from '../features/dashboard/Streak'
import { QuickAdd } from '../features/dashboard/QuickAdd'
import { RecentlyAdded } from '../features/dashboard/RecentlyAdded'
import { WordOfDay } from '../features/dashboard/WordOfDay'
import { WeekProgress } from '../features/dashboard/WeekProgress'
import { DashboardHeader } from '../features/dashboard/DashboardHeader'

export default async function DashboardPage() {
  const [summary, word, cards, me] = await Promise.all([
    apiFetch<ProgressSummary>('/progress/summary').catch(() => null),
    apiFetch<WordOfDayOut>('/dashboard/word-of-day').catch(() => null),
    apiFetch<CardOut[]>('/cards/recent?limit=3').catch(() => [] as CardOut[]),
    apiFetch<{ display_name: string; email: string }>('/auth/me').catch(() => null),
  ])
  return (
    <div style={{ animation: 'fadeUp .5s ease both' }}>
      <DashboardHeader displayName={me?.display_name} />
      <div style={{ display: 'flex', gap: '22px', marginBottom: '22px', flexWrap: 'wrap' }}>
        <TodaySession summary={summary} />
        <Streak summary={summary} />
      </div>
      <QuickAdd />
      <div style={{ display: 'flex', gap: '22px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <RecentlyAdded cards={cards} />
        <div style={{ width: '330px', flex: 'none', display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <WordOfDay word={word} />
          <WeekProgress summary={summary} />
        </div>
      </div>
    </div>
  )
}
