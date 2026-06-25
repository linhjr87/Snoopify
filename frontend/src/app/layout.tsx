import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '../components/Providers'
import { AppShell } from '../components/AppShell'
import { apiFetch } from '../lib/api-server'

export const metadata: Metadata = { title: 'Snoopify', description: 'Học từ vựng tiếng Anh' }

const themeScript = `try{var s=JSON.parse(localStorage.getItem('snoopify_v1')||'{}');if(s&&s.state&&s.state.dark){document.documentElement.classList.add('dark')}}catch(e){}`

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Soft-fail, no redirect: this layout also wraps /login, where there's no session yet.
  // Route-level auth is enforced by middleware.ts and each page's own apiFetch(...).catch(orRedirect).
  const me = await apiFetch<{ display_name: string; email: string }>('/auth/me').catch(() => null)

  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Newsreader:wght@400;500;600&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>
          <AppShell displayName={me?.display_name}>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}
