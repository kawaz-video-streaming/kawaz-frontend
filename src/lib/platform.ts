import { Capacitor } from '@capacitor/core'

export const isNative = Capacitor.isNativePlatform()
export const isAndroid = Capacitor.getPlatform() === 'android'
export const isIOS = Capacitor.getPlatform() === 'ios'

// Fire TV / Android TV WebViews sometimes include "Mobile Safari" in their UA
// (same as phones), but TV devices have no touch screen — maxTouchPoints === 0.
// Phones always have touch, so this cleanly separates the two.
export const isTV =
  Capacitor.isNativePlatform() &&
  (!navigator.userAgent.includes('Mobile') || navigator.maxTouchPoints === 0)
