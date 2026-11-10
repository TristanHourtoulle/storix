import type { Database, DbExecutor } from '@storix/db'
import { lockLeagueEconomyShared } from '../wallets/wallets.repository'
import { canReact, type CardReactors, type ReactionCounts, type ReactionType } from '@storix/shared'
import { AppError, notFound } from '../../lib/errors'
import { runInTransaction } from '../../lib/transaction'
import { isOwned } from '../cards/card-views'
import { findCardForViewer } from '../cards/cards.repository'
import { lockOwnedVariants } from '../copies/copies.repository'
import { awardEmblems } from '../emblems/emblems.service'
import { findMembership } from '../members/members.repository'
import type { Membership } from '../leagues/leagues.service'
import { addReaction, countReactions, listReactors, removeReaction } from './reactions.repository'

async function awardReactionEmblems(
  tx: DbExecutor,
  input: { leagueId: string; reactorId: string; authorId: string | null; now: Date },
): Promise<void> {
  await awardEmblems(tx, { leagueId: input.leagueId, userId: input.reactorId, now: input.now })
  if (input.authorId === null || input.authorId === input.reactorId) return
  if ((await findMembership(tx, input.leagueId, input.authorId)) === null) return
  await awardEmblems(tx, { leagueId: input.leagueId, userId: input.authorId, now: input.now })
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
  clock: () => Date
}

/** Builds the service letting owners react to cards they did not author, and anyone withdraw their own reaction. */
export function createReactionsService({ db, clock }: ReactionsServiceDeps): ReactionsService {
  return {
    setReaction: (m, cardId, type, isOn) =>
      runInTransaction(db, async (tx) => {
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
          await awardReactionEmblems(tx, {
            leagueId: m.leagueId,
            reactorId: m.userId,
            authorId: card.authorId,
            now: clock(),
          })
        } else {
          await removeReaction(tx, key)
        }
        return countReactions(tx, { cardId, viewerId: m.userId })
      }),

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
