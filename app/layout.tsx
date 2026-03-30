import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'HajunAI',
  description: 'BRAINPOOL 개발 맥락 보조 AI',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, padding: 0, background: '#0a0c10' }}>
        {children}
      </body>
    </html>
  )
}