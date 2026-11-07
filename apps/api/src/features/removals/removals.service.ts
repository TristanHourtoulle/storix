import type { Database } from '@storix/db'
import type { RemovedCards } from '@storix/shared'
import type { Membership } from '../leagues/leagues.service'
import { listRemovedSince } from './removals.repository'

const INITIAL_WINDOW_MS = 30 * 24 * 60 * 60 * 1000
const CURSOR_OVERLAP_MS = 10 * 60 * 1000
const REMOVED_LIMIT = 500

export interface RemovedCardsPage {
  since?: Date
  after?: string
}

export interface RemovalsService {
  listRemovedCards(m: Membership, page: RemovedCardsPage): Promise<RemovedCards>
}

export interface RemovalsServiceDeps {
  db: Database
  clock: () => Date
}

/** Builds the service telling members which cards were removed so their devices can purge them. */
export function createRemovalsService({ db, clock }: RemovalsServiceDeps): RemovalsService {
  return {
    async listRemovedCards(m, page) {
      const now = clock()
      const rows = await listRemovedSince(db, {
        leagueId: m.leagueId,
        viewerId: m.userId,
        since: page.since ?? new Date(now.getTime() - INITIAL_WINDOW_MS),
        after: page.since === undefined ? undefined : page.after,
        limit: REMOVED_LIMIT,
      })
      const last = rows.length === REMOVED_LIMIT ? rows.at(-1) : undefined
      return {
        removed: rows.map((row) => ({
          cardId: row.cardId,
          number: row.number,
          mediaPrefix: row.mediaPrefix,
          removedAt: row.removedAt.toISOString(),
          compensation: row.compensation,
        })),
        cursor: (last?.removedAt ?? new Date(now.getTime() - CURSOR_OVERLAP_MS)).toISOString(),
        after: last?.cardId ?? null,
        hasMore: last !== undefined,
      }
    },
  }
}
