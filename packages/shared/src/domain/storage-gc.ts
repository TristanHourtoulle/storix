export const GC_IMG_GRACE_MS = 86_400_000
export const GC_INCOMING_GRACE_MS = 172_800_000
export const GC_MAX_IMG_ORPHAN_RATIO = 0.25
export const GC_MAX_IMG_ORPHAN_COUNT = 3
export const STORAGE_DELETE_FRESHNESS_MARGIN_MS = 5_000

export interface StoredObject {
  key: string
  lastModified: Date
}

const IMG_PREFIX = 'img/'
const PIC_PREFIX = 'pic/'
const INCOMING_PREFIX = 'incoming/'
const MEDIA_PREFIX_SEGMENTS = { [IMG_PREFIX]: 3, [PIC_PREFIX]: 4 } as const

function isImageKey(key: string): boolean {
  return key.startsWith(IMG_PREFIX) || key.startsWith(PIC_PREFIX)
}

/** Returns the storage prefix holding the image the given key belongs to: 3 segments for `img/`, 4 for `pic/`. */
export function mediaPrefixOfKey(key: string): string {
  const segments = key.startsWith(PIC_PREFIX)
    ? MEDIA_PREFIX_SEGMENTS[PIC_PREFIX]
    : MEDIA_PREFIX_SEGMENTS[IMG_PREFIX]
  return `${key.split('/').slice(0, segments).join('/')}/`
}

/** Splits keys into those safe to delete and those refused: live image prefixes, live incoming keys and unknown prefixes. Input order is kept. */
export function filterDeletableKeys(input: {
  keys: readonly string[]
  liveMediaPrefixes: ReadonlySet<string>
  liveIncomingKeys: ReadonlySet<string>
}): { deletable: string[]; refused: string[] } {
  const { keys, liveMediaPrefixes, liveIncomingKeys } = input
  const isDeletable = (key: string): boolean => {
    if (isImageKey(key)) return !liveMediaPrefixes.has(mediaPrefixOfKey(key))
    if (key.startsWith(INCOMING_PREFIX)) return !liveIncomingKeys.has(key)
    return false
  }
  return {
    deletable: keys.filter(isDeletable),
    refused: keys.filter((key) => !isDeletable(key)),
  }
}

/**
 * Splits keys by the age of their listed object: deletable when written at or before
 * `requestedAt` minus the freshness margin, spared when newer, missing when not listed. Input order is kept.
 */
export function spareFreshObjects(input: {
  keys: readonly string[]
  objects: readonly StoredObject[]
  requestedAt: Date
}): { deletable: string[]; spared: string[]; missing: string[] } {
  const cutoff = input.requestedAt.getTime() - STORAGE_DELETE_FRESHNESS_MARGIN_MS
  const modifiedAt = new Map(
    input.objects.map(({ key, lastModified }) => [key, lastModified.getTime()]),
  )
  const isListed = (key: string): boolean => modifiedAt.has(key)
  const isOld = (key: string): boolean => (modifiedAt.get(key) ?? Infinity) <= cutoff
  return {
    deletable: input.keys.filter((key) => isListed(key) && isOld(key)),
    spared: input.keys.filter((key) => isListed(key) && !isOld(key)),
    missing: input.keys.filter((key) => !isListed(key)),
  }
}

/** Returns the sorted keys of stored objects no database row references, past their grace period. */
export function classifyOrphans(input: {
  objects: readonly StoredObject[]
  liveMediaPrefixes: ReadonlySet<string>
  liveIncomingKeys: ReadonlySet<string>
  now: Date
}): string[] {
  const { objects, liveMediaPrefixes, liveIncomingKeys, now } = input
  return objects
    .filter(({ key, lastModified }) => {
      const age = now.getTime() - lastModified.getTime()
      if (isImageKey(key)) {
        return age > GC_IMG_GRACE_MS && !liveMediaPrefixes.has(mediaPrefixOfKey(key))
      }
      if (key.startsWith(INCOMING_PREFIX)) {
        return age > GC_INCOMING_GRACE_MS && !liveIncomingKeys.has(key)
      }
      return false
    })
    .map(({ key }) => key)
    .sort()
}

export type GcSafetyVerdict =
  { safe: true } | { safe: false; reason: 'no-live-media' | 'too-many-orphans' }

/**
 * Decides whether a collection run looks sane enough to delete anything: it aborts when image
 * candidates exceed both `GC_MAX_IMG_ORPHAN_RATIO` of the scanned images and `GC_MAX_IMG_ORPHAN_COUNT`.
 */
export function evaluateGcSafety(input: {
  liveMediaPrefixCount: number
  imagesScanned: number
  imageCandidates: number
}): GcSafetyVerdict {
  const { liveMediaPrefixCount, imagesScanned, imageCandidates } = input
  if (liveMediaPrefixCount === 0 && imagesScanned > 0)
    return { safe: false, reason: 'no-live-media' }
  if (
    imageCandidates > GC_MAX_IMG_ORPHAN_COUNT &&
    imageCandidates > imagesScanned * GC_MAX_IMG_ORPHAN_RATIO
  ) {
    return { safe: false, reason: 'too-many-orphans' }
  }
  return { safe: true }
}
