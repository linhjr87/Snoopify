import 'server-only'
import { cookies } from 'next/headers'
import { ApiError } from './api'

const BACKEND = (process.env.BACKEND_URL as string | undefined) ?? 'http://localhost:8000'

export async function apiFetch<T>(path: string): Promise<T> {
  const sid = (await cookies()).get('sid')?.value
  const res = await fetch(`${BACKEND}${path}`, {
    cache: 'no-store',
    headers: sid ? { cookie: `sid=${sid}` } : {},
  })
  if (!res.ok) throw new ApiError(res.status, res.statusText)
  return (await res.json()) as T
}
