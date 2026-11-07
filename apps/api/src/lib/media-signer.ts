import { createHmac } from 'node:crypto'
import {
  buildMediaPath,
  isMediaWindowAccepted,
  mediaSignaturePayload,
  mediaWindowStart,
} from '@storix/shared'
import { safeEqualHex } from './crypto'

export interface MediaSigner {
  urlFor(objectKey: string): string
  verify(path: { windowStart: number; signature: string; objectKey: string }): boolean
}

function sign(secret: string, windowStart: number, objectKey: string): string {
  return createHmac('sha256', secret)
    .update(mediaSignaturePayload(windowStart, objectKey))
    .digest('hex')
}

/** Creates a signer issuing and verifying windowed HMAC media paths. */
export function createMediaSigner(secret: string, clock: () => Date): MediaSigner {
  return {
    urlFor(objectKey) {
      const windowStart = mediaWindowStart(clock())
      return buildMediaPath(windowStart, sign(secret, windowStart, objectKey), objectKey)
    },
    verify({ windowStart, signature, objectKey }) {
      if (!isMediaWindowAccepted(windowStart, clock())) return false
      return safeEqualHex(sign(secret, windowStart, objectKey), signature)
    },
  }
}
