import type { Database } from '@storix/db'
import type { ReactionCounts, ReactionType } from '@storix/shared'
import { AppError, notFound } from '../../lib/errors'
import { canReactTo } from '../cards/card-views'
import { findCardForViewer } from '../cards/cards.repository'
import type { Membership } from '../leagues/leagues.service'
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

/** Builds the service letting members who own a card they did not author react to it. */
export function createReactionsService({ db }: ReactionsServiceDeps): ReactionsService {
  return {
    async setReaction(m, cardId, type, isOn) {
      const card = await findCardForViewer(db, {
        leagueId: m.leagueId,
        cardId,
        viewerId: m.userId,
      })
      if (card === null) throw notFound('Card not found')
      if (!canReactTo(card, m.userId)) {
        throw new AppError('REACTION_NOT_ALLOWED', 403, 'You cannot react to this card')
      }
      const key = { cardId, userId: m.userId, type }
      await (isOn ? addReaction(db, key) : removeReaction(db, key))
      return countReactions(db, { cardId, viewerId: m.userId })
    },
  }
}
