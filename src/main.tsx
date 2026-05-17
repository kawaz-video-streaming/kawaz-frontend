import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { SplashScreen } from '@capacitor/splash-screen'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SystemBars } from './plugins/systemBars'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { isTV } from './lib/platform'
import './index.css'

if (Capacitor.isNativePlatform()) {
  if (isTV) {
    // Target 1920px layout for TV regardless of DPR — matches standard 1080p TV resolution
    // and triggers xl: breakpoints (6-card grid), consistent with the browser at 100% zoom.
    const meta = document.querySelector('meta[name="viewport"]') as HTMLMetaElement | null
    if (meta) meta.content = 'width=1920'
  } else {
    StatusBar.setOverlaysWebView({ overlay: true });
    StatusBar.setStyle({ style: Style.Dark });

    // Hide system bars in landscape for an edge-to-edge experience; restore in portrait.
    const orientationMq = window.matchMedia('(orientation: landscape)')
    const handleOrientation = (e: MediaQueryList | MediaQueryListEvent) => {
      if (e.matches) SystemBars.hide();
      else SystemBars.show();
    }
    handleOrientation(orientationMq)
    orientationMq.addEventListener('change', handleOrientation)
  }

  SplashScreen.hide();

  // TV back button is handled entirely by useTVControls (must manage fullscreen-exit too).
  // Registering a second handler here would cause double navigation on TV.
  if (!isTV) {
    CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else CapacitorApp.exitApp();
    });
  }
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
