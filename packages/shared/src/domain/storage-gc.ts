export const GC_IMG_GRACE_MS = 86_400_000
export const GC_INCOMING_GRACE_MS = 172_800_000

export interface StoredObject {
  key: string
  lastModified: Date
}

const IMG_PREFIX = 'img/'
const INCOMING_PREFIX = 'incoming/'
const IMG_PREFIX_SEGMENTS = 3

function mediaPrefixOf(key: string): string {
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
        return age > GC_IMG_GRACE_MS && !liveMediaPrefixes.has(mediaPrefixOf(key))
      }
      if (key.startsWith(INCOMING_PREFIX)) {
        return age > GC_INCOMING_GRACE_MS && !liveIncomingKeys.has(key)
      }
      return false
    })
    .map(({ key }) => key)
    .sort()
}
