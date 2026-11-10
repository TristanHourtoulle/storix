export const SHOWCASE_SLOTS = 6

/**
 * Resolves a member's showcase: saved cards still owned keep their order, then empty slots
 * are auto-filled from the member's owned cards ranked best first. Never more than six, never duplicated.
 */
export function resolveShowcase(
  savedCardIds: readonly string[],
  ownedRanked: readonly string[],
): string[] {
  const owned = new Set(ownedRanked)
  const kept = [...new Set(savedCardIds)].filter((id) => owned.has(id))
  const keptSet = new Set(kept)
  const fill = ownedRanked.filter((id) => !keptSet.has(id))
  return [...kept, ...fill].slice(0, SHOWCASE_SLOTS)
}
