import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '../components/Providers'
import { AppShell } from '../components/AppShell'

export const metadata: Metadata = { title: 'Snoopify', description: 'Học từ vựng tiếng Anh' }

const themeScript = `try{var s=JSON.parse(localStorage.getItem('snoopify_v1')||'{}');if(s&&s.state&&s.state.dark){document.documentElement.classList.add('dark')}}catch(e){}`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700&family=Newsreader:wght@400;500;600&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  )
}
