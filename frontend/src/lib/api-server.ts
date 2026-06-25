import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { ApiError } from './api'

const BACKEND = (process.env.BACKEND_URL as string | undefined) ?? 'http://localhost:8000'
const SID_RE = /^[A-Za-z0-9_-]{1,100}$/

export async function apiFetch<T>(path: string): Promise<T> {
  const sid = (await cookies()).get('sid')?.value
  const safeSid = sid && SID_RE.test(sid) ? sid : null
  const res = await fetch(`${BACKEND}${path}`, {
    cache: 'no-store',
    headers: safeSid ? { cookie: `sid=${safeSid}` } : {},
  })
  if (!res.ok) throw new ApiError(res.status, res.statusText)
  return (await res.json()) as T
}

export function orRedirect<T>(fallback: T): (err: unknown) => T {
  return (err: unknown): T => {
    if (err instanceof ApiError && err.status === 401) redirect('/login')
    return fallback
  }
}
