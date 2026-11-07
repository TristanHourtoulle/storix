import type { Database } from '@storix/db'
import { canReact, type ReactionCounts, type ReactionType } from '@storix/shared'
import { AppError, notFound } from '../../lib/errors'
import { runInTransaction } from '../../lib/transaction'
import { findCardForViewer } from '../cards/cards.repository'
import { lockOwnedVariants } from '../copies/copies.repository'
import type { Membership } from '../leagues/leagues.service'
import { lockLeagueEconomyShared } from '../wallets/wallets.repository'
import { addReaction, countReactions, removeReaction } from './reactions.repository'

export interface ReactionsService {
  setReaction(
    m: Membership,
    cardId: string,
    type: ReactionType,
    isOn: boolean,
  ): Promise<ReactionCounts>
}

export interface ReactionsServiceDeps {
  db: Database
}

/** Builds the service letting owners react to cards they did not author, and anyone withdraw their own reaction. */
export function createReactionsService({ db }: ReactionsServiceDeps): ReactionsService {
  return {
    setReaction: (m, cardId, type, isOn) =>
      runInTransaction(db, async (tx) => {
        await lockLeagueEconomyShared(tx, m.leagueId)
        const card = await findCardForViewer(tx, {
          leagueId: m.leagueId,
          cardId,
          viewerId: m.userId,
        })
        if (card === null) throw notFound('Card not found')
        const key = { cardId, userId: m.userId, type }
        if (isOn) {
          const owned = await lockOwnedVariants(tx, {
            leagueId: m.leagueId,
            cardId,
            ownerId: m.userId,
          })
          if (!canReact({ isAuthor: card.authorId === m.userId, ownsCopy: owned.length > 0 })) {
            throw new AppError('REACTION_NOT_ALLOWED', 403, 'You cannot react to this card')
          }
          await addReaction(tx, key)
        } else {
          await removeReaction(tx, key)
        }
        return countReactions(tx, { cardId, viewerId: m.userId })
      }),
  }
}
