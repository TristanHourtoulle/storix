export const GC_IMG_GRACE_MS = 86_400_000
export const GC_INCOMING_GRACE_MS = 172_800_000

export interface StoredObject {
  key: string
  lastModified: Date
}

const IMG_PREFIX = 'img/'
const INCOMING_PREFIX = 'incoming/'
const IMG_PREFIX_SEGMENTS = 3

/** Returns the storage prefix holding the image the given key belongs to. */
export function mediaPrefixOfKey(key: string): string {
  return `${key.split('/').slice(0, IMG_PREFIX_SEGMENTS).join('/')}/`
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
      if (key.startsWith(IMG_PREFIX)) {
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

/** Decides whether a collection run looks sane enough to delete anything. */
export function evaluateGcSafety(input: {
  liveMediaPrefixCount: number
  imagesScanned: number
  imageCandidates: number
  maxOrphanRatio: number
  maxOrphanCount: number
}): GcSafetyVerdict {
  const { liveMediaPrefixCount, imagesScanned, imageCandidates } = input
  if (liveMediaPrefixCount === 0 && imagesScanned > 0)
    return { safe: false, reason: 'no-live-media' }
  if (
    imageCandidates > input.maxOrphanCount &&
    imageCandidates > imagesScanned * input.maxOrphanRatio
  ) {
    return { safe: false, reason: 'too-many-orphans' }
  }
  return { safe: true }
}
