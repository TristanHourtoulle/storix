import type { Database } from '@storix/db'
import { AppError } from '../../lib/errors'
import { runInTransaction } from '../../lib/transaction'
import type { Membership } from '../leagues/leagues.service'
import { listOwnedCardsRanked } from '../members/member-profile.repository'
import { deleteShowcase, replaceShowcase } from './showcase.repository'

export interface ShowcaseService {
  save(m: Membership, cardIds: readonly string[]): Promise<void>
  reset(m: Membership): Promise<void>
}

export interface ShowcaseServiceDeps {
  db: Database
}

/** Builds the service saving the six cards a member shows off, or resetting to the automatic choice. */
export function createShowcaseService({ db }: ShowcaseServiceDeps): ShowcaseService {
  return {
    save: (m, cardIds) =>
      runInTransaction(db, async (tx) => {
        const member = { leagueId: m.leagueId, userId: m.userId }
        const owned = new Set(await listOwnedCardsRanked(tx, member))
        if (cardIds.some((cardId) => !owned.has(cardId))) {
          throw new AppError('SHOWCASE_INVALID', 409, 'Only active cards you own can be shown')
        }
        await replaceShowcase(tx, { ...member, cardIds })
      }),

    reset: (m) => deleteShowcase(db, { leagueId: m.leagueId, userId: m.userId }),
  }
}
