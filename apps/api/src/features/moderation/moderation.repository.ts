import { cardCopies, cardRarityHistory, cards, media, user, type DbExecutor } from '@storix/db'
import {
  mediaVariantsSchema,
  type AdminCardsQuery,
  type CardTier,
  type MediaVariant,
  type TierSource,
} from '@storix/shared'
import { and, desc, eq, gt, lt, sql, type SQL } from 'drizzle-orm'
import {
  authorIsFormerMember,
  authorMembership,
  authorMembershipOn,
} from '../cards/card-author.repository'

export { lockLeagueEconomyExclusive, lockLeagueModeration, lockLeagueRarity } from '@storix/db'

export type AdminCardFilter = AdminCardsQuery['filter']

export type CardStatus = 'active' | 'hidden'

export interface AdminCardRow {
  id: string
  number: number
  title: string
  status: CardStatus
  tier: CardTier
  computedTier: CardTier | null
  tierSource: TierSource
  pinnedTier: CardTier | null
  minTier: CardTier | null
  maxTier: CardTier | null
  authorId: string | null
  authorName: string | null
  authorIsFormerMember: boolean
  capturedAt: Date | null
  isCaptureDateValidated: boolean
  createdAt: Date
  copiesInLeague: number
  thumbhash: string
  dominantColor: string
  width: number
  height: number
  variants: MediaVariant[]
}

export interface ModerationCardRow {
  id: string
  number: number
  status: CardStatus
  tier: CardTier
  computedTier: CardTier | null
  tierSource: TierSource
  pinnedTier: CardTier | null
  minTier: CardTier | null
  maxTier: CardTier | null
  score: number | null
  percentile: number | null
  authorId: string | null
  mediaId: string
  capturedAt: Date | null
  isCaptureDateValidated: boolean
}

export type CardModerationPatch = Partial<{
  status: CardStatus
  pinnedTier: CardTier | null
  minTier: CardTier | null
  maxTier: CardTier | null
  tier: CardTier
  tierSource: TierSource
}>

export interface RarityHistoryInsert {
  leagueId: string
  cardId: string
  fromTier: CardTier
  toTier: CardTier
  source: TierSource
  score: number | null
  percentile: number | null
  computedAt: Date
}

const authorName = sql<
  string | null
>`coalesce(${user.displayUsername}, ${user.username}, ${user.name})`

function copyCounts(db: DbExecutor, leagueId: string) {
  return db
    .select({
      cardId: cardCopies.cardId,
      total: sql<number>`count(*)::int`.as('copies_total'),
    })
    .from(cardCopies)
    .where(eq(cardCopies.leagueId, leagueId))
    .groupBy(cardCopies.cardId)
    .as('copy_counts')
}

function filterCondition(filter: AdminCardFilter, eligibleBefore: Date): SQL | undefined {
  switch (filter) {
    case 'active':
      return eq(cards.status, 'active')
    case 'hidden':
      return eq(cards.status, 'hidden')
    case 'provisional':
      return gt(cards.createdAt, eligibleBefore)
    case 'mythic':
      return eq(cards.pinnedTier, 'mythic')
    case 'all':
      return undefined
  }
}

async function selectAdminCards(
  db: DbExecutor,
  leagueId: string,
  where: SQL | undefined,
  limit: number,
): Promise<AdminCardRow[]> {
  const counts = copyCounts(db, leagueId)
  const rows = await db
    .select({
      id: cards.id,
      number: cards.number,
      title: cards.title,
      status: cards.status,
      tier: cards.tier,
      computedTier: cards.computedTier,
      tierSource: cards.tierSource,
      pinnedTier: cards.pinnedTier,
      minTier: cards.minTier,
      maxTier: cards.maxTier,
      authorId: cards.authorId,
      authorName,
      authorIsFormerMember,
      capturedAt: media.capturedAt,
      isCaptureDateValidated: media.isCaptureDateValidated,
      createdAt: cards.createdAt,
      copiesInLeague: sql<number>`coalesce(${counts.total}, 0)::int`,
      thumbhash: media.thumbhash,
      dominantColor: media.dominantColor,
      width: media.width,
      height: media.height,
      variants: media.variants,
    })
    .from(cards)
    .innerJoin(media, eq(media.id, cards.mediaId))
    .leftJoin(user, eq(user.id, cards.authorId))
    .leftJoin(authorMembership, authorMembershipOn)
    .leftJoin(counts, eq(counts.cardId, cards.id))
    .where(and(eq(cards.leagueId, leagueId), where))
    .orderBy(desc(cards.number))
    .limit(limit)
  return rows.map((row) => ({ ...row, variants: mediaVariantsSchema.parse(row.variants) }))
}

/** Lists every card of a league for moderation, newest number first, fetching `limit + 1` rows. */
export async function listAdminCards(
  db: DbExecutor,
  input: {
    leagueId: string
    filter: AdminCardFilter
    beforeNumber?: number
    limit: number
    eligibleBefore: Date
  },
): Promise<AdminCardRow[]> {
  return selectAdminCards(
    db,
    input.leagueId,
    and(
      filterCondition(input.filter, input.eligibleBefore),
      input.beforeNumber === undefined ? undefined : lt(cards.number, input.beforeNumber),
    ),
    input.limit + 1,
  )
}

/** Finds one card of a league in its moderation view. */
export async function findAdminCard(
  db: DbExecutor,
  input: { leagueId: string; cardId: string },
): Promise<AdminCardRow | null> {
  const rows = await selectAdminCards(db, input.leagueId, eq(cards.id, input.cardId), 1)
  return rows[0] ?? null
}

/** Counts the league cards pinned Mythic, active and hidden alike. */
export async function countMythicPins(db: DbExecutor, leagueId: string): Promise<number> {
  const rows = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(cards)
    .where(and(eq(cards.leagueId, leagueId), eq(cards.pinnedTier, 'mythic')))
  return rows[0]?.total ?? 0
}

/** Finds a card of a league and locks it with its media row for the rest of the transaction. */
export async function findCardForModeration(
  db: DbExecutor,
  input: { leagueId: string; cardId: string },
): Promise<ModerationCardRow | null> {
  const rows = await db
    .select({
      id: cards.id,
      number: cards.number,
      status: cards.status,
      tier: cards.tier,
      computedTier: cards.computedTier,
      tierSource: cards.tierSource,
      pinnedTier: cards.pinnedTier,
      minTier: cards.minTier,
      maxTier: cards.maxTier,
      score: cards.score,
      percentile: cards.percentile,
      authorId: cards.authorId,
      mediaId: cards.mediaId,
      capturedAt: media.capturedAt,
      isCaptureDateValidated: media.isCaptureDateValidated,
    })
    .from(cards)
    .innerJoin(media, eq(media.id, cards.mediaId))
    .where(and(eq(cards.id, input.cardId), eq(cards.leagueId, input.leagueId)))
    .limit(1)
    .for('update')
  return rows[0] ?? null
}

/** Applies a moderation patch to a card. */
export async function updateCardModeration(
  db: DbExecutor,
  cardId: string,
  patch: CardModerationPatch,
): Promise<void> {
  if (Object.keys(patch).length === 0) return
  await db.update(cards).set(patch).where(eq(cards.id, cardId))
}

/** Sets whether the capture date of a media was validated by an admin. */
export async function setCaptureDateValidated(
  db: DbExecutor,
  mediaId: string,
  value: boolean,
): Promise<void> {
  await db.update(media).set({ isCaptureDateValidated: value }).where(eq(media.id, mediaId))
}

/** Appends one tier change to the rarity history. */
export async function insertRarityHistory(db: DbExecutor, row: RarityHistoryInsert): Promise<void> {
  await db.insert(cardRarityHistory).values(row)
}
