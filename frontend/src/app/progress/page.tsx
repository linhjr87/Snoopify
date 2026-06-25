import { apiFetch, orRedirect } from '../../lib/api-server'
import type { ProgressSummary, HeatmapOut, NeedsReviewItem } from '../../lib/api-types'
import ProgressScreen from '../../features/progress/ProgressScreen'

export default async function ProgressPage() {
  const [summary, heatmap, needsReview] = await Promise.all([
    apiFetch<ProgressSummary>('/progress/summary').catch(orRedirect(null)),
    apiFetch<HeatmapOut>('/progress/heatmap').catch(orRedirect(null)),
    apiFetch<NeedsReviewItem[]>('/progress/needs-review').catch(orRedirect([] as NeedsReviewItem[])),
  ])
  return <ProgressScreen summary={summary} heatmap={heatmap} needsReview={needsReview} />
}
