import { Capacitor } from '@capacitor/core'

export const isTV =
  Capacitor.isNativePlatform() &&
  /Android TV|AFTM|AFTT|AFTS|AFTB|AFTRS|AFTRE|AFTSO|AFTSSS|AFTA/.test(navigator.userAgent)
