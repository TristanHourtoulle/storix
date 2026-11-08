export const PORTRAIT_KINDS = ['avatar', 'league'] as const
export const PORTRAIT_SIZES = [128, 512] as const
export const PORTRAIT_SOURCE_MAX_PX = 1024

export type PortraitKind = (typeof PORTRAIT_KINDS)[number]
export type PortraitSize = (typeof PORTRAIT_SIZES)[number]

const UUID_SOURCE = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const OWNER_ID_SOURCE = '[A-Za-z0-9_-]{1,64}'

export const PORTRAIT_OBJECT_KEY_PATTERN = new RegExp(
  `^pic\\/(${PORTRAIT_KINDS.join('|')})\\/${OWNER_ID_SOURCE}\\/${UUID_SOURCE}\\/(${PORTRAIT_SIZES.join('|')})\\.webp$`,
)

export interface PortraitOwner {
  kind: PortraitKind
  ownerId: string
}

type PortraitUpload = PortraitOwner & { uploadId: string }

/** Returns the storage prefix holding every portrait upload of one owner. */
export function portraitOwnerPrefix(owner: PortraitOwner): string {
  return `pic/${owner.kind}/${owner.ownerId}/`
}

/** Returns the storage prefix holding the variants of one portrait upload. */
export function portraitPrefix(input: PortraitUpload): string {
  return `${portraitOwnerPrefix(input)}${input.uploadId}/`
}

/** Builds the storage key of one portrait variant. */
export function portraitVariantKey(input: PortraitUpload & { size: PortraitSize }): string {
  return `${portraitPrefix(input)}${input.size}.webp`
}

/** Returns every storage key a portrait upload owns, smallest size first. */
export function storedPortraitKeys(input: PortraitUpload): string[] {
  return PORTRAIT_SIZES.map((size) => portraitVariantKey({ ...input, size }))
}
