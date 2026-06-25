import { describe, it, expect } from 'vitest'
import { middleware } from './middleware'

function req(path: string, sid?: string) {
  const headers = new Headers()
  if (sid) headers.set('cookie', `sid=${sid}`)
  return { nextUrl: new URL(`http://localhost:3000${path}`), url: `http://localhost:3000${path}`,
           cookies: { get: (n: string) => (sid && n === 'sid' ? { value: sid } : undefined) } } as never
}

describe('middleware', () => {
  it('redirects unauthenticated protected route to /login', () => {
    const res = middleware(req('/library'))
    expect(res.headers.get('location')).toContain('/login')
  })
  it('redirects authenticated /login to /', () => {
    const res = middleware(req('/login', 'abc'))
    expect(res.headers.get('location')).toBe('http://localhost:3000/')
  })
  it('lets authenticated protected route through', () => {
    const res = middleware(req('/library', 'abc'))
    expect(res.headers.get('location')).toBeNull()
  })
})
