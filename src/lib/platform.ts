import { Capacitor } from '@capacitor/core'

// Android TV WebViews don't include "Mobile" in the user agent; phones always do.
export const isTV =
  Capacitor.isNativePlatform() &&
  !navigator.userAgent.includes('Mobile')
