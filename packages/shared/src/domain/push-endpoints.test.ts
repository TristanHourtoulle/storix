import { describe, expect, it } from 'vitest'
import { isAllowedPushEndpoint, PUSH_ENDPOINT_MAX_LENGTH } from './push-endpoints'

const FCM_BASE = 'https://fcm.googleapis.com/'
const APPLE_SUFFIX = 'push.apple.com'

function appleHostOfLength(length: number): string {
  const prefixLength = length - APPLE_SUFFIX.length
  const labels = Array.from({ length: Math.floor(prefixLength / 64) }, () => 'a'.repeat(63))
  const rest = prefixLength % 64
  const tail = rest > 1 ? ['b'.repeat(rest - 1)] : []
  return [...labels, ...tail, APPLE_SUFFIX].join('.')
}

describe('isAllowedPushEndpoint', () => {
  it.each([
    'https://fcm.googleapis.com/fcm/send/abc',
    'https://fcm.googleapis.com/fcm/send/dXk:APA91bH-x_y',
    'https://web.push.apple.com/QGx',
    'https://api.push.apple.com/QGx',
    'https://updates.push.services.mozilla.com/wpush/v2/x',
    'https://push.services.mozilla.com/x',
    'https://wns2-par02p.notify.windows.com/w/?token=x',
    `https://${'a'.repeat(63)}.notify.windows.com/x`,
  ])('accepts %s', (url) => expect(isAllowedPushEndpoint(url)).toBe(true))

  it.each([
    'http://fcm.googleapis.com/fcm/send/abc',
    'https://fcm.googleapis.com.evil.io/x',
    'https://fcm.googleapis.com.evil.com/x',
    'https://a.push.apple.com.evil.com/',
    'https://evilfcm.googleapis.com/x',
    'https://localhost/x',
    'https://169.254.169.254/latest',
    'https://user:pass@fcm.googleapis.com/x',
    'https://evil.com@fcm.googleapis.com/x',
    'https://fcm.googleapis.com:8443/x',
    'https://fcm.googleapis.com:443/x',
    'https://fcm.googleapis.com./x',
    'https://xn--fcm-xxx.googleapis.com/x',
    'https://fсm.googleapis.com/x',
    'https://FCM.googleapis.com/x',
    'https://.notify.windows.com/x',
    'https://.push.apple.com/x',
    'https://a..push.apple.com/x',
    'https://a..notify.windows.com/x',
    `https://${'a'.repeat(64)}.notify.windows.com/x`,
    `https://${'a'.repeat(64)}.push.apple.com/x`,
    'https://-a.push.apple.com/x',
    'https://a-.notify.windows.com/x',
    'https://fcm.googleapis.com',
    'not a url',
    '',
  ])('rejects %s', (url) => expect(isAllowedPushEndpoint(url)).toBe(false))

  it.each([
    'https://169.254.169.254%2epush.apple.com/latest',
    'https://127.0.0.1%2Enotify.windows.com/',
    'https://localhost%2epush.apple.com/x',
    'https://fcm%2egoogleapis.com/x',
    'https:fcm.googleapis.com/x',
    'https:/fcm.googleapis.com/x',
    'https://fcm.googleapis.com\\@evil.com/x',
    ' https://fcm.googleapis.com/x',
    'https://fcm.googleapis.com/x ',
    'https://fcm.googleapis.com\t/x',
    'https://fcm.googleapis.com#@evil.com/',
    'https://fcm.googleapis.com?x=@evil.com/',
  ])('rejects the non-canonical form %s that legacy parsers read differently', (url) =>
    expect(isAllowedPushEndpoint(url)).toBe(false),
  )

  it('rejects a host over 255 characters that url.parse empties to localhost', () => {
    const endpoint = `https://${'a.'.repeat(130)}push.apple.com/secret`
    expect(new URL(endpoint).hostname.length).toBeGreaterThan(255)
    expect(isAllowedPushEndpoint(endpoint)).toBe(false)
  })

  it('accepts a 253-character host and rejects a 254-character host', () => {
    const at253 = appleHostOfLength(253)
    const at254 = appleHostOfLength(254)
    expect(at253).toHaveLength(253)
    expect(at254).toHaveLength(254)
    expect(isAllowedPushEndpoint(`https://${at253}/x`)).toBe(true)
    expect(isAllowedPushEndpoint(`https://${at254}/x`)).toBe(false)
  })

  it('accepts exactly the max length and rejects one character more', () => {
    const atMax = FCM_BASE + 'a'.repeat(PUSH_ENDPOINT_MAX_LENGTH - FCM_BASE.length)
    expect(atMax).toHaveLength(2048)
    expect(isAllowedPushEndpoint(atMax)).toBe(true)
    expect(isAllowedPushEndpoint(`${atMax}a`)).toBe(false)
  })
})
