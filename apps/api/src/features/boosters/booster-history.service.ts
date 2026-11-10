import type { Database } from '@storix/db'
import type { BoosterHistoryPage, BoosterHistoryQuery, CollectionCard } from '@storix/shared'
import type { MediaSigner } from '../../lib/media-signer'
import { toCollectionCard, withViewerCopies } from '../cards/card-views'
import { listOwnedCopies, type OwnedCopyRow } from '../copies/copies.repository'
import { listStackEntries, type CardStackEntry } from '../copies/stacks.repository'
import type { Membership } from '../leagues/leagues.service'
import {
  historyStats,
  listOpeningsPage,
  listPullsWithCards,
  type HistoryCardRow,
  type HistoryCursor,
  type HistoryOpeningRow,
} from './booster-history.repository'

export interface BoosterHistoryService {
  listHistory(m: Membership, query: BoosterHistoryQuery): Promise<BoosterHistoryPage>
}

export interface BoosterHistoryServiceDeps {
  db: Database
  signer: MediaSigner
}

const CURSOR_SEPARATOR = '.'

function parseCursor(raw: string | undefined): HistoryCursor | undefined {
  if (raw === undefined) return undefined
  const [ms = '', id = ''] = raw.split(CURSOR_SEPARATOR)
  return { openedAtMs: Number(ms), id }
}

function encodeCursor(row: HistoryOpeningRow): string {
  return [row.openedAt.getTime(), row.id].join(CURSOR_SEPARATOR)
}

/** Builds the service listing a member's past booster openings with their pulls and stats. */
export function createBoosterHistoryService({
  db,
  signer,
}: BoosterHistoryServiceDeps): BoosterHistoryService {
  return {
    async listHistory(m, query) {
      const member = { leagueId: m.leagueId, userId: m.userId }
      const isFirstPage = query.cursor === undefined
      const [rows, stats] = await Promise.all([
        listOpeningsPage(db, { ...member, after: parseCursor(query.cursor), limit: query.limit }),
        isFirstPage ? historyStats(db, member) : null,
      ])
      const page = rows.slice(0, query.limit)
      const pulls = await listPullsWithCards(
        db,
        page.map((row) => row.id),
      )
      const cardIds = [
        ...new Set(
          [...pulls.map((pull) => pull.card), stats?.bestPull?.card ?? null]
            .filter((card): card is HistoryCardRow => card !== null)
            .map((card) => card.cardId),
        ),
      ]
      const [copies, stacks] = await Promise.all([
        listOwnedCopies(db, { leagueId: m.leagueId, ownerId: m.userId, cardIds }),
        listStackEntries(db, { leagueId: m.leagueId, ownerId: m.userId, cardIds }),
      ])
      const toCard = (card: HistoryCardRow | null): CollectionCard | null =>
        card === null ? null : viewCard(card, copies, stacks, signer)
      const last = page.at(-1)
      return {
        stats:
          stats === null
            ? null
            : {
                openedCount: stats.openedCount,
                premiumCount: stats.premiumCount,
                bestPull:
                  stats.bestPull === null
                    ? null
                    : {
                        tierAtMint: stats.bestPull.tierAtMint,
                        variant: stats.bestPull.variant,
                        card: toCard(stats.bestPull.card),
                      },
                boostersSinceLegendary: stats.boostersSinceLegendary,
              },
        openings: page.map((opening) => ({
          id: opening.id,
          openedAt: opening.openedAt.toISOString(),
          isPremium: opening.isPremium,
          pulls: pulls
            .filter((pull) => pull.openingId === opening.id)
            .map((pull) => ({
              slot: pull.slot,
              tierAtMint: pull.tierAtMint,
              variant: pull.variant,
              outcome: pull.outcome,
              dust: pull.dust,
              stackCount: pull.stackCount,
              isDiscovery: pull.isDiscovery,
              card: toCard(pull.card),
            })),
        })),
        nextCursor: rows.length > query.limit && last !== undefined ? encodeCursor(last) : null,
      }
    },
  }
}

function viewCard(
  card: HistoryCardRow,
  copies: readonly OwnedCopyRow[],
  stacks: readonly CardStackEntry[],
  signer: MediaSigner,
): CollectionCard {
  const { cardId, ...rest } = card
  return toCollectionCard(withViewerCopies({ id: cardId, ...rest }, copies, stacks), signer)
}
