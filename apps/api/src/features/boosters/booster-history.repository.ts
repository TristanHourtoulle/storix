import { boosterOpenings, boosterPulls, cards, media, user, type DbExecutor } from '@storix/db'
import {
  mediaVariantsSchema,
  type BoosterHistoryCursor,
  type CardTier,
  type CopyVariant,
  type MediaVariant,
  type PulledCopyOutcome,
} from '@storix/shared'
import { and, asc, desc, eq, gte, inArray, sql, type SQL } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import {
  authorIsFormerMember,
  authorMembership,
  authorMembershipOn,
} from '../cards/card-author.repository'
import { readyMomentSelfieUploadId } from '../cards/card-moment'

export interface HistoryOpeningRow {
  id: string
  openedAt: Date
  isPremium: boolean
}

export interface HistoryCardRow {
  cardId: string
  number: number
  title: string
  status: 'active' | 'hidden'
  tier: CardTier
  isProvisional: boolean
  authorId: string | null
  authorName: string | null
  authorIsFormerMember: boolean
  thumbhash: string
  dominantColor: string
  width: number
  height: number
  variants: MediaVariant[]
  leagueId: string
  momentSelfieUploadId: string | null
  momentTakenAt: Date | null
  momentLateMinutes: number | null
}

export interface HistoryPullRow {
  openingId: string
  slot: number
  tierAtMint: CardTier
  variant: CopyVariant
  outcome: PulledCopyOutcome
  dust: number
  stackCount: number | null
  isDiscovery: boolean
  card: HistoryCardRow | null
}

export interface HistoryStatsRow {
  openedCount: number
  premiumCount: number
  bestPull: { tierAtMint: CardTier; variant: CopyVariant; card: HistoryCardRow | null } | null
  boostersSinceLegendary: number | null
}

/** Alias of the card author used by `historyCardColumns`. */
export const historyAuthor = alias(user, 'history_author')

const authorName = sql<
  string | null
>`coalesce(${historyAuthor.displayUsername}, ${historyAuthor.username}, ${historyAuthor.name})`

const openedAtMs = sql`date_trunc('milliseconds', ${boosterOpenings.openedAt})`

/** Card, media and author columns of a card row as the collection views expect them. */
export const historyCardColumns = {
  cardId: cards.id,
  number: cards.number,
  title: cards.title,
  status: cards.status,
  tier: cards.tier,
  isProvisional: cards.isProvisional,
  authorId: cards.authorId,
  authorName,
  authorIsFormerMember,
  thumbhash: media.thumbhash,
  dominantColor: media.dominantColor,
  width: media.width,
  height: media.height,
  variants: media.variants,
  leagueId: cards.leagueId,
  momentSelfieUploadId: readyMomentSelfieUploadId,
  momentTakenAt: cards.momentTakenAt,
  momentLateMinutes: cards.momentLateMinutes,
}

/** Builds a card row from left-joined columns, or null when the card no longer exists. */
export function toHistoryCardRow(row: {
  cardId: string | null
  number: number | null
  title: string | null
  status: 'active' | 'hidden' | null
  tier: CardTier | null
  isProvisional: boolean | null
  authorId: string | null
  authorName: string | null
  authorIsFormerMember: boolean | null
  thumbhash: string | null
  dominantColor: string | null
  width: number | null
  height: number | null
  variants: unknown
  leagueId: string | null
  momentSelfieUploadId: string | null
  momentTakenAt: Date | null
  momentLateMinutes: number | null
}): HistoryCardRow | null {
  if (
    row.cardId === null ||
    row.number === null ||
    row.title === null ||
    row.status === null ||
    row.tier === null ||
    row.thumbhash === null ||
    row.dominantColor === null ||
    row.width === null ||
    row.height === null ||
    row.leagueId === null
  ) {
    return null
  }
  return {
    cardId: row.cardId,
    number: row.number,
    title: row.title,
    status: row.status,
    tier: row.tier,
    isProvisional: row.isProvisional ?? false,
    authorId: row.authorId,
    authorName: row.authorName,
    authorIsFormerMember: row.authorIsFormerMember ?? false,
    thumbhash: row.thumbhash,
    dominantColor: row.dominantColor,
    width: row.width,
    height: row.height,
    variants: mediaVariantsSchema.parse(row.variants),
    leagueId: row.leagueId,
    momentSelfieUploadId: row.momentSelfieUploadId,
    momentTakenAt: row.momentTakenAt,
    momentLateMinutes: row.momentLateMinutes,
  }
}

function memberOpenings(input: { leagueId: string; userId: string }): SQL | undefined {
  return and(eq(boosterOpenings.leagueId, input.leagueId), eq(boosterOpenings.userId, input.userId))
}

/** Lists a member's openings in a league newest first, fetching `limit + 1` rows after the cursor. */
export async function listOpeningsPage(
  db: DbExecutor,
  input: { leagueId: string; userId: string; after?: BoosterHistoryCursor; limit: number },
): Promise<HistoryOpeningRow[]> {
  const after =
    input.after === undefined
      ? undefined
      : sql`(${openedAtMs}, ${boosterOpenings.id}) < (${new Date(input.after.openedAtMs).toISOString()}::timestamptz, ${input.after.id}::uuid)`
  return db
    .select({
      id: boosterOpenings.id,
      openedAt: boosterOpenings.openedAt,
      isPremium: boosterOpenings.isPremium,
    })
    .from(boosterOpenings)
    .where(and(memberOpenings(input), after))
    .orderBy(desc(openedAtMs), desc(boosterOpenings.id))
    .limit(input.limit + 1)
}

/** Lists the pulls of the given openings by slot, with the card and media when the card still exists. */
export async function listPullsWithCards(
  db: DbExecutor,
  openingIds: readonly string[],
): Promise<HistoryPullRow[]> {
  if (openingIds.length === 0) return []
  const rows = await db
    .select({
      openingId: boosterPulls.openingId,
      slot: boosterPulls.slot,
      tierAtMint: boosterPulls.tierAtMint,
      variant: boosterPulls.variant,
      outcome: boosterPulls.outcome,
      dust: boosterPulls.dust,
      stackCount: boosterPulls.stackCount,
      isDiscovery: boosterPulls.isDiscovery,
      ...historyCardColumns,
    })
    .from(boosterPulls)
    .leftJoin(cards, eq(cards.id, boosterPulls.cardId))
    .leftJoin(media, eq(media.id, cards.mediaId))
    .leftJoin(historyAuthor, eq(historyAuthor.id, cards.authorId))
    .leftJoin(authorMembership, authorMembershipOn)
    .where(inArray(boosterPulls.openingId, [...openingIds]))
    .orderBy(asc(boosterPulls.openingId), asc(boosterPulls.slot))
  return rows.map((row) => ({
    openingId: row.openingId,
    slot: row.slot,
    tierAtMint: row.tierAtMint,
    variant: row.variant,
    outcome: row.outcome,
    dust: row.dust,
    stackCount: row.stackCount,
    isDiscovery: row.isDiscovery,
    card: toHistoryCardRow(row),
  }))
}

/**
 * Aggregates a member's booster history: openings, premium openings, the best pull (highest tier at
 * mint, then foil, then most recent) and how many boosters were opened since the last one holding
 * a Legendary or better, null when none ever did.
 */
export async function historyStats(
  db: DbExecutor,
  input: { leagueId: string; userId: string },
): Promise<HistoryStatsRow> {
  const lastLegendaryAt = db
    .select({ at: sql<Date>`max(${boosterOpenings.openedAt})`.as('last_legendary_at') })
    .from(boosterOpenings)
    .innerJoin(boosterPulls, eq(boosterPulls.openingId, boosterOpenings.id))
    .where(and(memberOpenings(input), gte(boosterPulls.tierAtMint, 'legendary')))
    .as('last_legendary')
  const [counts, best] = await Promise.all([
    db
      .select({
        openedCount: sql<number>`count(*)::int`,
        premiumCount: sql<number>`(count(*) filter (where ${boosterOpenings.isPremium}))::int`,
        sinceLegendary: sql<
          number | null
        >`(case when max(${lastLegendaryAt.at}) is null then null else (count(*) filter (where ${boosterOpenings.openedAt} > ${lastLegendaryAt.at}))::int end)`,
      })
      .from(boosterOpenings)
      .crossJoin(lastLegendaryAt)
      .where(memberOpenings(input)),
    db
      .select({
        tierAtMint: boosterPulls.tierAtMint,
        pullVariant: boosterPulls.variant,
        ...historyCardColumns,
      })
      .from(boosterPulls)
      .innerJoin(boosterOpenings, eq(boosterOpenings.id, boosterPulls.openingId))
      .leftJoin(cards, eq(cards.id, boosterPulls.cardId))
      .leftJoin(media, eq(media.id, cards.mediaId))
      .leftJoin(historyAuthor, eq(historyAuthor.id, cards.authorId))
      .leftJoin(authorMembership, authorMembershipOn)
      .where(memberOpenings(input))
      .orderBy(
        desc(boosterPulls.tierAtMint),
        sql`(${boosterPulls.variant} = 'foil') DESC`,
        desc(boosterOpenings.openedAt),
        asc(boosterPulls.slot),
      )
      .limit(1),
  ])
  const count = counts[0]
  const top = best[0]
  return {
    openedCount: count?.openedCount ?? 0,
    premiumCount: count?.premiumCount ?? 0,
    bestPull:
      top === undefined
        ? null
        : { tierAtMint: top.tierAtMint, variant: top.pullVariant, card: toHistoryCardRow(top) },
    boostersSinceLegendary: count?.sinceLegendary ?? null,
  }
}
