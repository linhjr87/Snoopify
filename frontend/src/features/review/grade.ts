import { apiPost } from '../../lib/api'
import { useAppStore } from '../../store/useAppStore'
import type { GradeRequest, GradeResult } from '../../lib/api-types'

// The session advances optimistically; persist the grade and surface a
// non-blocking warning on failure (mirrors the old useGradeMutation behavior).
export async function submitGrade(req: GradeRequest): Promise<void> {
  try {
    await apiPost<GradeResult>('/review/grade', req)
    useAppStore.getState().setGradeError(false)
  } catch {
    useAppStore.getState().setGradeError(true)
  }
}
