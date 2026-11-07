export const REACTION_TYPES = ['fire', 'heart', 'star'] as const

export type ReactionType = (typeof REACTION_TYPES)[number]

/** Returns true when a member may react to a card: not its author and owning a copy. */
export function canReact(input: { isAuthor: boolean; ownsCopy: boolean }): boolean {
  return !input.isAuthor && input.ownsCopy
}
