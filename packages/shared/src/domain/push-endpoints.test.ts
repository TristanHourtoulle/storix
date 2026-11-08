import { describe, expect, it } from 'vitest'
import { isAllowedPushEndpoint } from './push-endpoints'

describe('isAllowedPushEndpoint', () => {
  it.each([
    'https://fcm.googleapis.com/fcm/send/abc',
    'https://web.push.apple.com/QGx',
    'https://updates.push.services.mozilla.com/wpush/v2/x',
    'https://wns2-par02p.notify.windows.com/w/?token=x',
  ])('accepts %s', (url) => expect(isAllowedPushEndpoint(url)).toBe(true))

  it.each([
    'http://fcm.googleapis.com/fcm/send/abc',
    'https://fcm.googleapis.com.evil.io/x',
    'https://evilfcm.googleapis.com/x',
    'https://localhost/x',
    'https://169.254.169.254/latest',
    'https://user:pass@fcm.googleapis.com/x',
    'https://fcm.googleapis.com:8443/x',
    'not a url',
    `https://fcm.googleapis.com/${'a'.repeat(2048)}`,
  ])('rejects %s', (url) => expect(isAllowedPushEndpoint(url)).toBe(false))
})
