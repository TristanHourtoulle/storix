import {
  cardCopies,
  cards,
  cosmeticPurchases,
  media,
  userCosmetics,
  type DbExecutor,
} from '@storix/db'
import {
  cosmeticItemIdSchema,
  type CardTier,
  type CosmeticItemId,
  type CosmeticSlot,
  type EquippedCosmetics,
} from '@storix/shared'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { authorMembership, authorMembershipOn } from '../cards/card-author.repository'
import {
  historyAuthor,
  historyCardColumns,
  toHistoryCardRow,
  type HistoryCardRow,
} from '../boosters/booster-history.repository'

export interface PurchaseRow {
  userId: string
  itemId: CosmeticItemId
  leagueId: string
  price: number
}

export interface OwnedCardTierRow {
  id: string
  tier: CardTier
}

const EMPTY_EQUIPPED: EquippedCosmetics = {
  booster: null,
  cardBack: null,
  raritySet: null,
  avatarFrame: null,
  revealAura: null,
  banner: null,
  nameStyle: null,
  momentStamp: null,
  openingTear: null,
}

const SLOT_COLUMNS = {
  booster: userCosmetics.booster,
  cardBack: userCosmetics.cardBack,
  raritySet: userCosmetics.raritySet,
  avatarFrame: userCosmetics.avatarFrame,
  revealAura: userCosmetics.revealAura,
  banner: userCosmetics.banner,
  nameStyle: userCosmetics.nameStyle,
  momentStamp: userCosmetics.momentStamp,
  openingTear: userCosmetics.openingTear,
} as const satisfies Record<CosmeticSlot, unknown>

function toItemId(value: string | null): CosmeticItemId | null {
  const parsed = cosmeticItemIdSchema.safeParse(value)
  return parsed.success ? parsed.data : null
}

/** Lists the catalogue items a user owns, ignoring ids no longer in the catalogue. */
export async function listOwnedItemIds(db: DbExecutor, userId: string): Promise<CosmeticItemId[]> {
  const rows = await db
    .select({ itemId: cosmeticPurchases.itemId })
    .from(cosmeticPurchases)
    .where(eq(cosmeticPurchases.userId, userId))
    .orderBy(cosmeticPurchases.purchasedAt)
  return rows.flatMap((row) => {
    const id = toItemId(row.itemId)
    return id === null ? [] : [id]
  })
}

/** Finds the items a user has equipped, every slot null when nothing was ever equipped. */
export async function findEquipped(db: DbExecutor, userId: string): Promise<EquippedCosmetics> {
  const rows = await db
    .select(SLOT_COLUMNS)
    .from(userCosmetics)
    .where(eq(userCosmetics.userId, userId))
    .limit(1)
  const row = rows[0]
  if (row === undefined) return EMPTY_EQUIPPED
  return {
    booster: toItemId(row.booster),
    cardBack: toItemId(row.cardBack),
    raritySet: toItemId(row.raritySet),
    avatarFrame: toItemId(row.avatarFrame),
    revealAura: toItemId(row.revealAura),
    banner: toItemId(row.banner),
    nameStyle: toItemId(row.nameStyle),
    momentStamp: toItemId(row.momentStamp),
    openingTear: toItemId(row.openingTear),
  }
}

/** Sets one equipped slot of a user, creating the row on first equip. */
export async function upsertEquippedSlot(
  db: DbExecutor,
  input: { userId: string; slot: CosmeticSlot; itemId: CosmeticItemId | null },
): Promise<void> {
  const now = new Date()
  const patch = { [input.slot]: input.itemId, updatedAt: now }
  await db
    .insert(userCosmetics)
    .values({ userId: input.userId, ...patch })
    .onConflictDoUpdate({ target: userCosmetics.userId, set: patch })
}

/** Records a purchase, failing with a unique violation when the user already owns the item. */
export async function insertPurchase(db: DbExecutor, row: PurchaseRow): Promise<void> {
  await db.insert(cosmeticPurchases).values(row)
}

export interface MemberLook {
  avatarFrame: CosmeticItemId | null
  nameStyle: CosmeticItemId | null
  banner: CosmeticItemId | null
}

export const ORIGINAL_LOOK: MemberLook = { avatarFrame: null, nameStyle: null, banner: null }

/** Maps each given user to the cosmetics the league sees on them, absent when they wear none. */
export async function findMemberLooks(
  db: DbExecutor,
  userIds: readonly string[],
): Promise<ReadonlyMap<string, MemberLook>> {
  if (userIds.length === 0) return new Map()
  const rows = await db
    .select({
      userId: userCosmetics.userId,
      avatarFrame: userCosmetics.avatarFrame,
      nameStyle: userCosmetics.nameStyle,
      banner: userCosmetics.banner,
    })
    .from(userCosmetics)
    .where(inArray(userCosmetics.userId, [...new Set(userIds)]))
  return new Map(
    rows.map((row) => [
      row.userId,
      {
        avatarFrame: toItemId(row.avatarFrame),
        nameStyle: toItemId(row.nameStyle),
        banner: toItemId(row.banner),
      },
    ]),
  )
}

/** Lists the active cards a member owns in a league with their league tier, newest card first. */
export async function listOwnedCardTiers(
  db: DbExecutor,
  input: { leagueId: string; userId: string },
): Promise<OwnedCardTierRow[]> {
  return db
    .selectDistinct({ id: cards.id, tier: cards.tier, number: cards.number })
    .from(cardCopies)
    .innerJoin(cards, eq(cards.id, cardCopies.cardId))
    .where(
      and(
        eq(cardCopies.leagueId, input.leagueId),
        eq(cardCopies.ownerId, input.userId),
        eq(cards.status, 'active'),
      ),
    )
    .orderBy(desc(cards.number))
}

/** Loads the given cards with their media and author, in the shape the collection views expect. */
export async function listCardRows(
  db: DbExecutor,
  cardIds: readonly string[],
): Promise<HistoryCardRow[]> {
  if (cardIds.length === 0) return []
  const rows = await db
    .select(historyCardColumns)
    .from(cards)
    .innerJoin(media, eq(media.id, cards.mediaId))
    .leftJoin(historyAuthor, eq(historyAuthor.id, cards.authorId))
    .leftJoin(authorMembership, authorMembershipOn)
    .where(inArray(cards.id, [...cardIds]))
  return rows.flatMap((row) => {
    const card = toHistoryCardRow(row)
    return card === null ? [] : [card]
  })
}
