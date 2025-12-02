import '@/styles/theme.css'
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
        <Navigation />
        <main>{children}</main>
      </body>
    </html>
  )
}
