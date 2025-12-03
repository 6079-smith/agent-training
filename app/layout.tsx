import '@/styles/theme.css'
import layoutStyles from '@/styles/layout.module.css'
import Navigation from '@/components/Navigation'
import type { Metadata, Viewport } from 'next'
import { ReactElement, ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'CS Agent Prompt Optimizer',
  description: 'Prompt optimization workbench for CS Agent training',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({
  children,
}: RootLayoutProps): ReactElement {
  return (
    <html lang="en">
      <body>
        <div className={layoutStyles.appContainer}>
          <Navigation />
          <main className={layoutStyles.mainContent}>{children}</main>
        </div>
      </body>
    </html>
  )
}
