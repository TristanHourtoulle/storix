import { type InstallEnv, installContextOf } from '@storix/shared'

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean
}

function isIpadDesktop(): boolean {
  return navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
}

/** True on iOS or iPadOS in any browser or as an installed home-screen app. */
export function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || isIpadDesktop()
}

/** True when the app runs as an installed home-screen app. */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as NavigatorWithStandalone).standalone === true
  )
}

/** Reads the browser environment used to decide how the app can be installed. */
export function readInstallEnv(hasInstallPrompt: boolean): InstallEnv {
  return {
    userAgent: navigator.userAgent,
    isStandalone: isStandalone(),
    isIpadDesktop: isIpadDesktop(),
    hasInstallPrompt,
  }
}

/** True when running in Safari on iOS or iPadOS (not other browsers, in-app webviews or installed). */
export function isIosSafari(): boolean {
  return installContextOf(readInstallEnv(false)) === 'ios-safari'
}
