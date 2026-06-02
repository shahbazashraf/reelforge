// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import { Providers } from '@/components/Providers'

export const metadata: Metadata = {
  title: 'ReelForge — AI Social Content Studio',
  description: 'Create, schedule and publish reels, shorts & posts to every platform. AI-powered. No video model needed.',
  openGraph: {
    title: 'ReelForge',
    description: 'AI-powered social content factory',
    images: ['/og.png'],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
