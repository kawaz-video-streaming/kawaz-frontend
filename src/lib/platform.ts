import { Capacitor } from '@capacitor/core'

export const isNative = Capacitor.isNativePlatform()
export const isAndroid = Capacitor.getPlatform() === 'android'
export const isIOS = Capacitor.getPlatform() === 'ios'

// TV devices (Fire TV, Android TV) have no touch screen — maxTouchPoints === 0.
// iPads use a desktop UA (no "Mobile" token) so UA checks are unreliable; touch
// points cleanly separate TVs from all touch-capable devices.
export const isTV =
  Capacitor.isNativePlatform() &&
  navigator.maxTouchPoints === 0
