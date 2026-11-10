export type InstallContext =
  | 'installed'
  | 'in-app'
  | 'ios-safari'
  | 'ios-other'
  | 'android-prompt'
  | 'android-manual'
  | 'desktop'

export type InAppBrowser =
  'messenger' | 'facebook' | 'instagram' | 'whatsapp' | 'snapchat' | 'tiktok' | 'linkedin' | 'line'

export interface InstallEnv {
  userAgent: string
  isStandalone: boolean
  isIpadDesktop: boolean
  hasInstallPrompt: boolean
}

const IN_APP_PATTERNS: readonly (readonly [InAppBrowser, RegExp])[] = [
  ['messenger', /MessengerForiOS|FB_IAB\/MESSENGER|Orca-Android/],
  ['facebook', /FBAN|FBAV|FB_IAB/],
  ['instagram', /Instagram/],
  ['whatsapp', /WhatsApp/],
  ['snapchat', /Snapchat/],
  ['tiktok', /musical_ly|BytedanceWebview|TikTok/],
  ['linkedin', /LinkedInApp/],
  ['line', /\bLine\//],
]

const IOS_DEVICE = /iPad|iPhone|iPod/
const IOS_OTHER_BROWSER = /CriOS|FxiOS|EdgiOS|OPiOS/
const ANDROID = /Android/

/** Returns the social app whose webview runs the page, or null in a regular browser. */
export function inAppBrowserOf(userAgent: string): InAppBrowser | null {
  return IN_APP_PATTERNS.find(([, pattern]) => pattern.test(userAgent))?.[0] ?? null
}

/** Classifies how the app can be installed from the current browser environment. */
export function installContextOf(env: InstallEnv): InstallContext {
  if (env.isStandalone) return 'installed'
  if (inAppBrowserOf(env.userAgent) !== null) return 'in-app'
  if (IOS_DEVICE.test(env.userAgent) || env.isIpadDesktop) {
    return IOS_OTHER_BROWSER.test(env.userAgent) ? 'ios-other' : 'ios-safari'
  }
  if (ANDROID.test(env.userAgent)) return env.hasInstallPrompt ? 'android-prompt' : 'android-manual'
  return 'desktop'
}

/** Builds an Android intent URL that reopens `url` in Chrome, falling back to `url` itself. */
export function chromeIntentUrl(url: string): string {
  const target = url.replace(/^https?:\/\//, '')
  return `intent://${target}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`
}
