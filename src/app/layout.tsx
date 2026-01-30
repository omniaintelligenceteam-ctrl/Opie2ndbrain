import type { Metadata } from 'next'
import GlobalStyles from '../components/GlobalStyles'

export const metadata: Metadata = {
  title: '2nd Brain',
  description: 'Your personal knowledge base',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <GlobalStyles />
        {children}
      </body>
    </html>
  )
}
