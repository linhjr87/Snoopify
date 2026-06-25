import { apiFetch } from '../../lib/api-server'
import type { ReviewItemOut } from '../../lib/api-types'
import { toSessionItem } from '../../lib/adapters'
import ReviewScreen from '../../features/review/ReviewScreen'

export default async function ReviewPage() {
  const items = await apiFetch<ReviewItemOut[]>('/review/session?limit=20').catch(() => [] as ReviewItemOut[])
  return <ReviewScreen session={items.map(toSessionItem)} />
}
