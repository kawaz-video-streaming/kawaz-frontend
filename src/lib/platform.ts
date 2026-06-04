import { Capacitor } from '@capacitor/core'

const w = window as Window & { __KAWAZ_PLATFORM__?: string }

// Apple TV WKWebView wrapper injects __KAWAZ_PLATFORM__ = 'tv' at document start
export const isNative = Capacitor.isNativePlatform() || w.__KAWAZ_PLATFORM__ === 'tv'

// Fire TV / Android TV: Capacitor native with no touch screen
// Apple TV: WKWebView with __KAWAZ_PLATFORM__ injected by native wrapper
export const isTV =
  (Capacitor.isNativePlatform() &&
    (!navigator.userAgent.includes('Mobile') || navigator.maxTouchPoints === 0)) ||
  w.__KAWAZ_PLATFORM__ === 'tv'
