import { portraitOwnerPrefix, type PortraitOwner } from '@storix/shared'
import type { ObjectStorage } from '@storix/storage'

/** Lists every stored portrait object of the given owners, across all their uploads. */
export async function listOwnerPortraitKeys(
  storage: ObjectStorage,
  owners: readonly PortraitOwner[],
): Promise<string[]> {
  const keys: string[] = []
  for (const owner of owners) {
    for await (const object of storage.list(portraitOwnerPrefix(owner))) keys.push(object.key)
  }
  return keys
}
