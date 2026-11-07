import type { Database } from '@storix/db'
import type { RemovedCards } from '@storix/shared'
import type { Membership } from '../leagues/leagues.service'
import { listRemovedSince } from './removals.repository'

const INITIAL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000
const CURSOR_OVERLAP_MS = 10 * 60 * 1000
const REMOVED_LIMIT = 500

export interface RemovalsService {
  listRemovedCards(m: Membership, since: Date | undefined): Promise<RemovedCards>
}

export interface RemovalsServiceDeps {
  db: Database
  clock: () => Date
}

/** Builds the service telling members which cards were removed so their devices can purge them. */
export function createRemovalsService({ db, clock }: RemovalsServiceDeps): RemovalsService {
  return {
    async listRemovedCards(m, since) {
      const now = clock()
      const rows = await listRemovedSince(db, {
        leagueId: m.leagueId,
        viewerId: m.userId,
        since: since ?? new Date(now.getTime() - INITIAL_WINDOW_MS),
        limit: REMOVED_LIMIT,
      })
      return {
        removed: rows.map((row) => ({
          cardId: row.cardId,
          number: row.number,
          mediaPrefix: row.mediaPrefix,
          removedAt: row.removedAt.toISOString(),
          compensation: row.compensation,
        })),
        cursor: new Date(now.getTime() - CURSOR_OVERLAP_MS).toISOString(),
      }
    },
  }
}
