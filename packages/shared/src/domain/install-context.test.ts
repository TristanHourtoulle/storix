import { describe, expect, it } from 'vitest'
import {
  chromeIntentUrl,
  inAppBrowserOf,
  type InstallEnv,
  installContextOf,
} from './install-context'

const IOS_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
const IOS_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1'
const IOS_MESSENGER =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/458.0.0.38.108;FBBV/585425385;FBDV/iPhone15,2;FBMD/iPhone;FBSN/iOS;FBSV/17.4;FBSS/3;FBCR/;FBID/phone;FBLC/fr_FR;FBOP/5]'
const IPAD_DESKTOP =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15'
const ANDROID_CHROME =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36'
const ANDROID_INSTAGRAM =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A.240405.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/124.0.6367.82 Mobile Safari/537.36 Instagram 327.0.0.42.89 Android (34/14; 420dpi; 1080x2400; Google/google; Pixel 8; shiba; shiba; fr_FR; 587456123)'

const env = (overrides: Partial<InstallEnv>): InstallEnv => ({
  userAgent: IOS_SAFARI,
  isStandalone: false,
  isIpadDesktop: false,
  hasInstallPrompt: false,
  ...overrides,
})

describe('installContextOf', () => {
  it('returns installed when standalone, whatever the browser', () => {
    expect(installContextOf(env({ userAgent: IOS_MESSENGER, isStandalone: true }))).toBe(
      'installed',
    )
  })

  it('detects the iOS Messenger webview as in-app messenger', () => {
    expect(installContextOf(env({ userAgent: IOS_MESSENGER }))).toBe('in-app')
    expect(inAppBrowserOf(IOS_MESSENGER)).toBe('messenger')
  })

  it('detects the Android Instagram webview as in-app instagram', () => {
    expect(installContextOf(env({ userAgent: ANDROID_INSTAGRAM, hasInstallPrompt: true }))).toBe(
      'in-app',
    )
    expect(inAppBrowserOf(ANDROID_INSTAGRAM)).toBe('instagram')
  })

  it('returns ios-safari for Safari on iPhone', () => {
    expect(installContextOf(env({ userAgent: IOS_SAFARI }))).toBe('ios-safari')
  })

  it('returns ios-other for Chrome on iPhone', () => {
    expect(installContextOf(env({ userAgent: IOS_CHROME }))).toBe('ios-other')
  })

  it('returns ios-safari for an iPad reporting a desktop user agent', () => {
    expect(installContextOf(env({ userAgent: IPAD_DESKTOP, isIpadDesktop: true }))).toBe(
      'ios-safari',
    )
  })

  it('returns android-prompt with a captured prompt and android-manual without', () => {
    expect(installContextOf(env({ userAgent: ANDROID_CHROME, hasInstallPrompt: true }))).toBe(
      'android-prompt',
    )
    expect(installContextOf(env({ userAgent: ANDROID_CHROME }))).toBe('android-manual')
  })
})

describe('chromeIntentUrl', () => {
  it('builds an intent URL with an encoded fallback', () => {
    expect(chromeIntentUrl('https://h/p?q')).toBe(
      'intent://h/p?q#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=https%3A%2F%2Fh%2Fp%3Fq;end',
    )
  })
})
