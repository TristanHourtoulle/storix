import type { Database } from '@storix/db'
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
  listAuditCounts,
  listAuthoredPhotos,
  listClaimedMissions,
  listCopies,
  listMuseCopies,
  listOnTimeMoments,
  listOwnedTiers,
  listPullCounts,
  listReactionsReceived,
  listShopSpent,
  listStandingsPeople,
  type OwnedTierRow,
  type UserCountRow,
} from './standings.repository'

export interface StandingsService {
  getStandings(m: Membership): Promise<LeagueStandings>
}

export interface StandingsServiceDeps {
  db: Database
  signer: MediaSigner
  clock: () => Date
}

type CollectionStats = Pick<
  MemberStats,
  'uniqueCards' | 'rarityScore' | 'mythics' | 'legendaries' | 'weekCards'
>

const EMPTY_COLLECTION: CollectionStats = {
  uniqueCards: 0,
  rarityScore: 0,
  mythics: 0,
  legendaries: 0,
  weekCards: 0,
}

/** 1 for Commune up to 6 for Mythique, 0 when the member owns no foil. */
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
    })
  }, new Map<string, CollectionStats>())
}

function byUser(rows: readonly UserCountRow[]): Map<string, number> {
  return new Map(rows.map((row) => [row.userId, row.value]))
}

/** Builds the service behind the Ligue page: every member's ranking and trophy stats in one call. */
export function createStandingsService({
  db,
  signer,
  clock,
}: StandingsServiceDeps): StandingsService {
  return {
    async getStandings(m) {
      const weekStart = periodBounds('week', missionWeekKey(clock())).start
      const [
        people,
        leagueCardCount,
        ownedTiers,
        copies,
        photos,
        reactionsReceived,
        muse,
        audit,
        pulls,
        moments,
        missions,
        shopSpent,
      ] = await Promise.all([
        listStandingsPeople(db, m.leagueId),
        countLeagueCards(db, m.leagueId),
        listOwnedTiers(db, m.leagueId, weekStart),
        listCopies(db, m.leagueId),
        listAuthoredPhotos(db, m.leagueId),
        listReactionsReceived(db, m.leagueId),
        listMuseCopies(db, m.leagueId),
        listAuditCounts(db, m.leagueId),
        listPullCounts(db, m.leagueId),
        listOnTimeMoments(db, m.leagueId),
        listClaimedMissions(db, m.leagueId),
        listShopSpent(db, m.leagueId),
      ])
      const looks = await findMemberLooks(
        db,
        people.map((person) => person.userId),
      )
      const collection = collectionByOwner(ownedTiers)
      const copiesOf = new Map(copies.map((row) => [row.ownerId, row]))
      const auditOf = new Map(audit.map((row) => [row.userId, row]))
      const pullsOf = new Map(pulls.map((row) => [row.userId, row]))
      const photosOf = byUser(photos)
      const reactionsOf = byUser(reactionsReceived)
      const museOf = byUser(muse)
      const momentsOf = byUser(moments)
      const missionsOf = byUser(missions)
      const shopOf = byUser(shopSpent)

      const members = people.map((person): StandingsMember => {
        const look = looks.get(person.userId) ?? ORIGINAL_LOOK
        const owned = copiesOf.get(person.userId)
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
          isSelf: person.userId === m.userId,
          joinedAt: person.joinedAt.toISOString(),
          stats: {
            ...(collection.get(person.userId) ?? EMPTY_COLLECTION),
            copies: owned?.copies ?? 0,
            foils: owned?.foils ?? 0,
            bestFoilTier: tierRank(owned?.bestFoilTier ?? null),
            photos: photosOf.get(person.userId) ?? 0,
            reactionsReceived: reactionsOf.get(person.userId) ?? 0,
            muse: museOf.get(person.userId) ?? 0,
            boostersOpened: person.boostersOpened,
            dust: person.dust,
            promotions: auditOf.get(person.userId)?.promotions ?? 0,
            recycled: auditOf.get(person.userId)?.recycled ?? 0,
            discoveries: pullsOf.get(person.userId)?.discoveries ?? 0,
            mythicPulls: pullsOf.get(person.userId)?.mythicPulls ?? 0,
            onTimeMoments: momentsOf.get(person.userId) ?? 0,
            missions: missionsOf.get(person.userId) ?? 0,
            shopSpent: shopOf.get(person.userId) ?? 0,
          },
        }
      })
      return { leagueCardCount, members }
    },
  }
}
