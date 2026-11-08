import { mediaCachePathPrefix, parseMediaPath } from './media-urls'
import { mediaPrefixOfKey } from './storage-gc'

export interface PortraitCacheOwner {
  ownerPrefix: string
  currentPrefix: string | null
}

const PIC_PREFIX = 'pic/'
const URL_BASE = 'http://local'

function pathnameOf(url: string): string | null {
  try {
    return new URL(url, URL_BASE).pathname
  } catch {
    return null
  }
}

/** Returns the `pic/<kind>/<owner>/<upload>/` prefix of a relative or absolute signed portrait URL, or null. */
export function portraitPrefixOfMediaUrl(url: string): string | null {
  const pathname = pathnameOf(url)
  if (pathname === null) return null
  const parsed = parseMediaPath(pathname)
  if (parsed === null || !parsed.objectKey.startsWith(PIC_PREFIX)) return null
  return mediaPrefixOfKey(parsed.objectKey)
}

/** Returns the cached `/media/pic/...` paths of known owners that are not under the owner's current prefix. */
export function stalePortraitCachePaths(
  cachedPaths: readonly string[],
  owners: readonly PortraitCacheOwner[],
): string[] {
  return cachedPaths.filter((path) => {
    const owner = owners.find(({ ownerPrefix }) =>
      path.startsWith(mediaCachePathPrefix(ownerPrefix)),
    )
    if (owner === undefined) return false
    return (
      owner.currentPrefix === null || !path.startsWith(mediaCachePathPrefix(owner.currentPrefix))
    )
  })
}
