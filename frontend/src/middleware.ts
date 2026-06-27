import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
  const sid = req.cookies.get('sid')?.value
  const { pathname } = req.nextUrl
  const isLogin = pathname === '/login'
  if (isLogin && sid) return NextResponse.redirect(new URL('/', req.url))
  if (!isLogin && !sid) {
    const url = new URL('/login', req.url)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  // everything except api, next internals, and static files
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
