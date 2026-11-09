import type { ImageSource } from '@storix/shared'

/** Picks the widest source of an image set, the first one on a tie. */
export function largestSource(sources: readonly ImageSource[]): ImageSource | undefined {
  return sources.reduce<ImageSource | undefined>(
    (best, source) => (best && best.width >= source.width ? best : source),
    undefined,
  )
}
