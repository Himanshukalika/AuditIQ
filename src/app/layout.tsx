import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/app/components/Sidebar'
import Topbar from '@/app/components/Topbar'

export const metadata: Metadata = {
  title: 'AuditIQ — CA Tax Audit Platform',
  description: 'AI-powered tax audit automation for CA firms',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex flex-col flex-1 overflow-hidden">
            <Topbar />
            <main className="flex-1 overflow-y-auto p-6" style={{ background: 'var(--bg)' }}>
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
