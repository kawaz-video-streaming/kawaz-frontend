import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'

if (Capacitor.isNativePlatform()) {
  // Android TV / Fire TV: force lg+ viewport so the desktop layout applies
  if (/Android TV|AFTM|AFTT|AFTS|AFTB|AFTRS|AFTRE|AFTSO|AFTSSS|AFTA/.test(navigator.userAgent)) {
    const meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null
    if (meta) meta.content = 'width=1280'
  }

  StatusBar.setOverlaysWebView({ overlay: true });
  StatusBar.setStyle({ style: Style.Dark });
  SplashScreen.hide();

  CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else CapacitorApp.exitApp();
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
    },
  },
})

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found')
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
)
