import { cards, leagueMembers } from '@storix/db'
import { and, eq, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'

/** The card author's membership in the card's league, absent once the author left it. */
export const authorMembership = alias(leagueMembers, 'author_membership')

/** Left-join condition binding `authorMembership` to the card's (league, author) pair. */
export const authorMembershipOn = and(
  eq(authorMembership.leagueId, cards.leagueId),
  eq(authorMembership.userId, cards.authorId),
)

/** True when the author's account exists but is no longer a member of the card's league. */
export const authorIsFormerMember = sql<boolean>`(${cards.authorId} is not null and ${authorMembership.userId} is null)`
