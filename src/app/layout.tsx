import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from '../contexts/ThemeContext'
import { AgentPersonalityProvider } from '../contexts/AgentPersonalityContext'
import { AgentPerformanceProvider } from '../contexts/AgentPerformanceContext'
import GlobalStyles from '../components/GlobalStyles'

export const metadata: Metadata = {
  title: 'Opie 2nd Brain',
  description: 'Your AI-powered second brain and agent army commander',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Opie',
  },
  icons: {
    icon: '/opie-avatar.png',
    apple: '/opie-avatar.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#667eea',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        
        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/opie-avatar.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful');
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <AgentPersonalityProvider>
            <AgentPerformanceProvider>
              <GlobalStyles />
              {children}
            </AgentPerformanceProvider>
          </AgentPersonalityProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
