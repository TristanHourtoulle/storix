import { PORTRAIT_OBJECT_KEY_PATTERN } from './portraits'

export const MEDIA_WINDOW_SECONDS = 86_400
export const MEDIA_VARIANT_SIZES = [256, 768, 1600] as const
export const MEDIA_FORMATS = ['avif', 'webp'] as const

export type MediaVariantSize = (typeof MEDIA_VARIANT_SIZES)[number]
export type MediaFormat = (typeof MEDIA_FORMATS)[number]

export const MEDIA_OBJECT_KEY_PATTERN =
  /^img\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{64}\/(?:c[0-9a-f]{16}\/)?(256|768|1600)\.(avif|webp)$/

/** Tells whether a key is a servable media object: a card image variant or a portrait variant. */
export function isMediaObjectKey(key: string): boolean {
  return MEDIA_OBJECT_KEY_PATTERN.test(key) || PORTRAIT_OBJECT_KEY_PATTERN.test(key)
}

const SIGNATURE_PATTERN = /^[0-9a-f]{64}$/
const WINDOW_PATTERN = /^[1-9][0-9]*$/
const MEDIA_PREFIX = '/media/'

function nowSeconds(now: Date): number {
  return Math.floor(now.getTime() / 1000)
}

/** Returns the unix seconds of the UTC midnight at or before `now`. */
export function mediaWindowStart(now: Date): number {
  return nowSeconds(now) - (nowSeconds(now) % MEDIA_WINDOW_SECONDS)
}

/** Tells whether a window start is the current or the previous window. */
export function isMediaWindowAccepted(windowStart: number, now: Date): boolean {
  const current = mediaWindowStart(now)
  return windowStart === current || windowStart === current - MEDIA_WINDOW_SECONDS
}

/** Returns the seconds until a URL signed for `windowStart` stops being accepted. */
export function mediaMaxAgeSeconds(windowStart: number, now: Date): number {
  if (!isMediaWindowAccepted(windowStart, now)) return 0
  const seconds = windowStart + 2 * MEDIA_WINDOW_SECONDS - nowSeconds(now)
  return Math.max(0, Math.floor(seconds))
}

/** Returns the exact string that is signed for a media URL. */
export function mediaSignaturePayload(windowStart: number, objectKey: string): string {
  return `${windowStart}\n${objectKey}`
}

/** Builds the storage key of an image variant. */
export function mediaVariantKey(input: {
  leagueId: string
  sourceSha256: string
  size: MediaVariantSize
  format: MediaFormat
}): string {
  return `img/${input.leagueId}/${input.sourceSha256}/${input.size}.${input.format}`
}

/** Builds the storage key of an image variant rendered through a crop. */
export function mediaCropVariantKey(input: {
  leagueId: string
  sourceSha256: string
  cropId: string
  size: MediaVariantSize
  format: MediaFormat
}): string {
  return `img/${input.leagueId}/${input.sourceSha256}/c${input.cropId}/${input.size}.${input.format}`
}

/** Builds the public path of a signed media URL. */
export function buildMediaPath(windowStart: number, signature: string, objectKey: string): string {
  return `${MEDIA_PREFIX}${windowStart}/${signature}/${objectKey}`
}

/** Parses a media path, returning null for anything malformed. */
export function parseMediaPath(
  pathname: string,
): { windowStart: number; signature: string; objectKey: string } | null {
  if (!pathname.startsWith(MEDIA_PREFIX)) return null
  const rest = pathname.slice(MEDIA_PREFIX.length)
  const first = rest.indexOf('/')
  if (first === -1) return null
  const second = rest.indexOf('/', first + 1)
  if (second === -1) return null
  const windowPart = rest.slice(0, first)
  const signature = rest.slice(first + 1, second)
  const objectKey = rest.slice(second + 1)
  if (!WINDOW_PATTERN.test(windowPart)) return null
  const windowStart = Number(windowPart)
  if (!Number.isSafeInteger(windowStart) || windowStart % MEDIA_WINDOW_SECONDS !== 0) return null
  if (!SIGNATURE_PATTERN.test(signature)) return null
  if (!isMediaObjectKey(objectKey)) return null
  return { windowStart, signature, objectKey }
}

/** Returns the window-independent cache key of a media path, or null. */
export function mediaCacheKey(pathname: string): string | null {
  const parsed = parseMediaPath(pathname)
  return parsed === null ? null : `${MEDIA_PREFIX}${parsed.objectKey}`
}

/** Returns the storage prefix holding every variant of one source image. */
export function mediaPrefix(input: { leagueId: string; sourceSha256: string }): string {
  return `img/${input.leagueId}/${input.sourceSha256}/`
}

/** Returns the storage prefix holding every image of a league. */
export function leagueMediaPrefix(leagueId: string): string {
  return `img/${leagueId}/`
}

/** Returns the media path prefix that service worker cache keys start with. */
export function mediaCachePathPrefix(prefix: string): string {
  return `${MEDIA_PREFIX}${prefix}`
}

/** Returns every storage key a media row may own: its listed variants, all full-frame variants, the cropped variants of `cropIds`, and its source when still present. */
export function storedMediaKeys(input: {
  leagueId: string
  sourceSha256: string
  variants: readonly { key: string }[]
  cropIds?: readonly string[]
  sourceKey?: string | null
}): string[] {
  const { leagueId, sourceSha256 } = input
  const sized = MEDIA_VARIANT_SIZES.flatMap((size) =>
    MEDIA_FORMATS.map((format) => ({ size, format })),
  )
  const fullFrame = sized.map((variant) => mediaVariantKey({ leagueId, sourceSha256, ...variant }))
  const cropped = (input.cropIds ?? []).flatMap((cropId) =>
    sized.map((variant) => mediaCropVariantKey({ leagueId, sourceSha256, cropId, ...variant })),
  )
  const source = input.sourceKey ? [input.sourceKey] : []
  return [
    ...new Set([
      ...input.variants.map((variant) => variant.key),
      ...fullFrame,
      ...cropped,
      ...source,
    ]),
  ]
}
