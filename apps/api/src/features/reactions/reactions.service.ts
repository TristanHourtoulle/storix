import type { Database } from '@storix/db'
import { lockLeagueEconomyShared } from '../wallets/wallets.repository'
import { canReact, type CardReactors, type ReactionCounts, type ReactionType } from '@storix/shared'
import { AppError, notFound } from '../../lib/errors'
import { runInTransaction } from '../../lib/transaction'
import { isOwned } from '../cards/card-views'
import { findCardForViewer } from '../cards/cards.repository'
import { lockOwnedVariants } from '../copies/copies.repository'
import type { EmblemAwards } from '../emblems/emblems.service'
import type { Membership } from '../leagues/leagues.service'
import { addReaction, countReactions, listReactors, removeReaction } from './reactions.repository'

function reactionMembers(
  leagueId: string,
  reactorId: string,
  authorId: string | null,
): { leagueId: string; userId: string }[] {
  const reactor = { leagueId, userId: reactorId }
  return authorId === null || authorId === reactorId
    ? [reactor]
    : [reactor, { leagueId, userId: authorId }]
}

export interface ReactionsService {
  setReaction(
    m: Membership,
    cardId: string,
    type: ReactionType,
    isOn: boolean,
  ): Promise<ReactionCounts>
  listReactors(m: Membership, cardId: string): Promise<CardReactors>
}

export interface ReactionsServiceDeps {
  db: Database
  emblems: EmblemAwards
}

/** Builds the service letting owners react to cards they did not author, and anyone withdraw their own reaction. */
export function createReactionsService({ db, emblems }: ReactionsServiceDeps): ReactionsService {
  return {
    async setReaction(m, cardId, type, isOn) {
      const { counts, authorId } = await runInTransaction(db, async (tx) => {
        await lockLeagueEconomyShared(tx, m.leagueId)
        const card = await findCardForViewer(tx, {
          leagueId: m.leagueId,
          cardId,
          viewerId: m.userId,
        })
        if (card === null || card.status !== 'active') throw notFound('Card not found')
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
        return {
          counts: await countReactions(tx, { cardId, viewerId: m.userId }),
          authorId: card.authorId,
        }
      })
      if (isOn) await emblems.request(reactionMembers(m.leagueId, m.userId, authorId))
      return counts
    },

    async listReactors(m, cardId) {
      const card = await findCardForViewer(db, {
        leagueId: m.leagueId,
        cardId,
        viewerId: m.userId,
      })
      if (card === null || card.status !== 'active' || !isOwned(card)) {
        throw notFound('Card not found')
      }
      const [counts, reactors] = await Promise.all([
        countReactions(db, { cardId, viewerId: m.userId }),
        listReactors(db, { leagueId: m.leagueId, cardId }),
      ])
      return { counts, reactors }
    },
  }
}
