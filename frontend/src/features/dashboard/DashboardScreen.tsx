import { TodaySession } from './TodaySession'
import { Streak } from './Streak'
import { QuickAdd } from './QuickAdd'
import { RecentlyAdded } from './RecentlyAdded'
import { WordOfDay } from './WordOfDay'
import { WeekProgress } from './WeekProgress'

export default function DashboardScreen() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <TodaySession /><QuickAdd /><RecentlyAdded />
      </div>
      <div className="space-y-5">
        <Streak /><WordOfDay /><WeekProgress />
      </div>
    </div>
  )
}
