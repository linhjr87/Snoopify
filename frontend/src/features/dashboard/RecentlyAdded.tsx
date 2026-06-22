import { Card } from '../../components/ui/Card'
import { TagPill } from '../../components/ui/TagPill'
import { recentlyAdded } from '../../data/seed'

export function RecentlyAdded() {
  return (
    <Card className="p-5">
      <div className="mb-3 text-sm font-semibold text-ink">Mới thêm gần đây</div>
      <div className="space-y-3">
        {recentlyAdded.map((item) => (
          <div key={item.title} className="flex items-start gap-3">
            <TagPill>{item.type}</TagPill>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-ink truncate">{item.title}</div>
              <div className="text-xs text-muted truncate">{item.sub}</div>
            </div>
            <span className="text-xs text-muted shrink-0">{item.when}</span>
          </div>
        ))}
      </div>
      <button className="mt-4 text-xs text-accent hover:underline">Xem tất cả →</button>
    </Card>
  )
}
