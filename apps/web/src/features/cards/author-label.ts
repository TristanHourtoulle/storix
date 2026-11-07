import type { CardAuthor } from '@storix/shared'

/** Author credit of a card, marking authors who left the league. */
export function authorLabel(author: CardAuthor): string {
  if (author.displayUsername === null) return 'Ancien membre'
  return author.isFormerMember
    ? `${author.displayUsername} · ancien membre`
    : author.displayUsername
}
