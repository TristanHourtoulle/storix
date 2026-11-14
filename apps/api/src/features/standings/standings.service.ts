import type { Database, DbExecutor } from '@storix/db'
import {
  CARD_TIERS,
  RARITY_SCORE,
  missionWeekKey,
  periodBounds,
  type CardTier,
  type LeagueStandings,
  type MemberStats,
  type StandingsMember,
} from '@storix/shared'
import type { MediaSigner } from '../../lib/media-signer'
import { ORIGINAL_LOOK, findMemberLooks } from '../cosmetics/cosmetics.repository'
import type { Membership } from '../leagues/leagues.service'
import { toPortraitView } from '../portraits/portrait-view'
import {
  countLeagueCards,
  listAuthored,
  listOwnedTiers,
  listStacked,
  listStandingsPeople,
  type OwnedTierRow,
} from './standings.repository'

export interface StandingsService {
  getStandings(m: Membership): Promise<LeagueStandings>
}

export interface StandingsServiceDeps {
  db: Database
  signer: MediaSigner
  clock: () => Date
}

/** How long a league's standings are reused before being recomputed. */
export const STANDINGS_CACHE_MS = 30_000

type SharedMember = Omit<StandingsMember, 'isSelf'>

interface LeagueSnapshot {
  leagueCardCount: number
  members: SharedMember[]
}

type CollectionStats = Pick<
  MemberStats,
  | 'uniqueCards'
  | 'rarityScore'
  | 'mythics'
  | 'legendaries'
  | 'weekCards'
  | 'copies'
  | 'foils'
  | 'bestFoilTier'
>

const EMPTY_COLLECTION: CollectionStats = {
  uniqueCards: 0,
  rarityScore: 0,
  mythics: 0,
  legendaries: 0,
  weekCards: 0,
  copies: 0,
  foils: 0,
  bestFoilTier: 0,
}

/** 1 for Commune up to 6 for Mythique, 0 when there is no tier. */
function tierRank(tier: CardTier | null): number {
  return tier === null ? 0 : CARD_TIERS.indexOf(tier) + 1
}

function collectionByOwner(rows: readonly OwnedTierRow[]): Map<string, CollectionStats> {
  return rows.reduce((totals, row) => {
    const current = totals.get(row.ownerId) ?? EMPTY_COLLECTION
    return new Map(totals).set(row.ownerId, {
      uniqueCards: current.uniqueCards + row.cards,
      rarityScore: current.rarityScore + row.cards * RARITY_SCORE[row.tier],
      mythics: current.mythics + (row.tier === 'mythic' ? row.cards : 0),
      legendaries: current.legendaries + (row.tier === 'legendary' ? row.cards : 0),
      weekCards: current.weekCards + row.weekCards,
      copies: current.copies + row.copies,
      foils: current.foils + row.foils,
      bestFoilTier: Math.max(current.bestFoilTier, tierRank(row.bestFoilTier)),
    })
  }, new Map<string, CollectionStats>())
}

/** Builds the service behind the Ligue page: every member's ranking and trophy stats in one call. */
export function createStandingsService({
  db,
  signer,
  clock,
}: StandingsServiceDeps): StandingsService {
  const cache = new Map<string, { at: number; snapshot: LeagueSnapshot }>()

  async function readSnapshot(tx: DbExecutor, leagueId: string): Promise<LeagueSnapshot> {
    const weekStart = periodBounds('week', missionWeekKey(clock())).start
    const people = await listStandingsPeople(tx, leagueId)
    const leagueCardCount = await countLeagueCards(tx, leagueId)
    const owned = await listOwnedTiers(tx, leagueId, weekStart)
    const stacked = await listStacked(tx, leagueId)
    const authored = await listAuthored(tx, leagueId)
    const looks = await findMemberLooks(
      tx,
      people.map((person) => person.userId),
    )
    const collection = collectionByOwner(owned)
    const stackedOf = new Map(stacked.map((row) => [row.ownerId, row.stacked]))
    const authoredOf = new Map(authored.map((row) => [row.userId, row]))

    const members = people.map((person): SharedMember => {
      const look = looks.get(person.userId) ?? ORIGINAL_LOOK
      const own = collection.get(person.userId) ?? EMPTY_COLLECTION
      const photos = authoredOf.get(person.userId)
      const avatar =
        person.avatarUploadId === null || person.avatarColor === null
          ? null
          : toPortraitView(
              {
                kind: 'avatar',
                ownerId: person.userId,
                uploadId: person.avatarUploadId,
                dominantColor: person.avatarColor,
              },
              signer,
            )
      return {
        userId: person.userId,
        displayUsername: person.displayUsername,
        avatar,
        avatarFrame: look.avatarFrame,
        nameStyle: look.nameStyle,
        joinedAt: person.joinedAt.toISOString(),
        stats: {
          ...own,
          copies: own.copies + (stackedOf.get(person.userId) ?? 0),
          photos: photos?.photos ?? 0,
          reactionsReceived: photos?.reactionsReceived ?? 0,
          muse: photos?.muse ?? 0,
          boostersOpened: person.boostersOpened,
          dust: person.dust,
          promotions: person.promotions,
          recycled: person.recycled,
          discoveries: person.discoveries,
          mythicPulls: person.mythicPulls,
          onTimeMoments: person.onTimeMoments,
          missions: person.missions,
          shopSpent: person.shopSpent,
        },
      }
    })
    return { leagueCardCount, members }
  }

  async function snapshotOf(leagueId: string): Promise<LeagueSnapshot> {
    const now = clock().getTime()
    const cached = cache.get(leagueId)
    if (cached !== undefined && now - cached.at < STANDINGS_CACHE_MS) return cached.snapshot
    const snapshot = await db.transaction((tx) => readSnapshot(tx, leagueId), {
      accessMode: 'read only',
    })
    for (const [key, entry] of cache) {
      if (now - entry.at >= STANDINGS_CACHE_MS) cache.delete(key)
    }
    cache.set(leagueId, { at: now, snapshot })
    return snapshot
  }

  return {
    async getStandings(m) {
      const snapshot = await snapshotOf(m.leagueId)
      return {
        leagueCardCount: snapshot.leagueCardCount,
        members: snapshot.members.map((member) => ({
          ...member,
          isSelf: member.userId === m.userId,
        })),
      }
    },
  }
}
