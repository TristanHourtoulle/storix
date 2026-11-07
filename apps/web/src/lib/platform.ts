interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean
}

/** True on iOS or iPadOS in any browser or as an installed home-screen app. */
export function isIos(): boolean {
  const { userAgent, platform, maxTouchPoints } = navigator
  return /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)
}

/** True when running in Safari on iOS or iPadOS (not Chrome, Firefox or in-app browsers). */
export function isIosSafari(): boolean {
  const { userAgent } = navigator
  const isOtherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent)
  return isIos() && !isOtherBrowser && /Safari/.test(userAgent)
}

/** True when the app runs as an installed home-screen app. */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as NavigatorWithStandalone).standalone === true
  )
}
