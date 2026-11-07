interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean
}

/** True when running in Safari on iOS or iPadOS (not Chrome, Firefox or in-app browsers). */
export function isIosSafari(): boolean {
  const { userAgent, platform, maxTouchPoints } = navigator
  const isIos =
    /iPad|iPhone|iPod/.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1)
  const isOtherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent)
  return isIos && !isOtherBrowser && /Safari/.test(userAgent)
}

/** True when the app runs as an installed home-screen app. */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as NavigatorWithStandalone).standalone === true
  )
}
