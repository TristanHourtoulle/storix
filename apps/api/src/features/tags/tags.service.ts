import type { Database } from '@storix/db'
import { CARD_TAGS_MAX, hasRoleAtLeast } from '@storix/shared'
import { AppError, notFound } from '../../lib/errors'
import { runInTransaction } from '../../lib/transaction'
import { isOwned } from '../cards/card-views'
import { findCardForViewer } from '../cards/cards.repository'
import type { Membership } from '../leagues/leagues.service'
import { countCardTags, deleteCardTag, insertCardTag } from './tags.repository'

export interface TagsService {
  tagSelf(m: Membership, cardId: string): Promise<void>
  removeTag(m: Membership, cardId: string, userId: string): Promise<void>
}

export interface TagsServiceDeps {
  db: Database
  clock: () => Date
}

function tagNotAllowed(message: string): AppError {
  return new AppError('TAG_NOT_ALLOWED', 403, message)
}

/** Builds the service letting owners tag themselves on a card, and the tagged member, the author or an admin remove a tag. */
export function createTagsService({ db, clock }: TagsServiceDeps): TagsService {
  return {
    tagSelf: (m, cardId) =>
      runInTransaction(db, async (tx) => {
        const card = await findCardForViewer(tx, {
          leagueId: m.leagueId,
          cardId,
          viewerId: m.userId,
        })
        if (card === null || card.status !== 'active') throw notFound('Card not found')
        if (!isOwned(card)) throw tagNotAllowed('Only owners can tag themselves on a card')
        if ((await countCardTags(tx, cardId)) >= CARD_TAGS_MAX) {
          throw tagNotAllowed('This card has too many tags')
        }
        await insertCardTag(tx, { cardId, userId: m.userId, taggedById: m.userId, now: clock() })
      }),

    removeTag: (m, cardId, userId) =>
      runInTransaction(db, async (tx) => {
        const card = await findCardForViewer(tx, {
          leagueId: m.leagueId,
          cardId,
          viewerId: m.userId,
        })
        if (card === null) throw notFound('Card not found')
        const allowed =
          userId === m.userId || card.authorId === m.userId || hasRoleAtLeast(m.role, 'admin')
        if (!allowed) throw tagNotAllowed('You cannot remove this tag')
        if (!(await deleteCardTag(tx, { cardId, userId }))) throw notFound('Tag not found')
      }),
  }
}
