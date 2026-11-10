import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import type { CardAuthor } from '@storix/shared'

interface AuthorLinkProps {
  leagueId: string
  author: CardAuthor
  children: ReactNode
}

/** Wraps a card's author line in a link to their member page; former members stay plain text. */
export function AuthorLink({ leagueId, author, children }: AuthorLinkProps) {
  if (author.userId === null || author.isFormerMember) return <>{children}</>
  return (
    <Link
      to="/l/$leagueId/members/$userId"
      params={{ leagueId, userId: author.userId }}
      className="author-link"
    >
      {children}
    </Link>
  )
}
