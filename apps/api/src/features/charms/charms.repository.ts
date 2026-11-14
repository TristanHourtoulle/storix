import { cards, charmPurchases, type DbExecutor } from '@storix/db'
import { and, desc, eq, gt, sql } from 'drizzle-orm'

export interface CharmPurchaseRow {
  leagueId: string
  userId: string
  charm: string
  price: number
}

/** Lists when a member bought charms in a league since `since`, newest first. */
export async function listCharmPurchaseDates(
  db: DbExecutor,
  input: { leagueId: string; userId: string; since: Date },
): Promise<Date[]> {
  const rows = await db
    .select({ purchasedAt: charmPurchases.purchasedAt })
    .from(charmPurchases)
    .where(
      and(
        eq(charmPurchases.leagueId, input.leagueId),
        eq(charmPurchases.userId, input.userId),
        gt(charmPurchases.purchasedAt, input.since),
      ),
    )
    .orderBy(desc(charmPurchases.purchasedAt))
  return rows.map((row) => row.purchasedAt)
}

/** Records a charm purchase. */
export async function insertCharmPurchase(
  db: DbExecutor,
  row: CharmPurchaseRow & { purchasedAt: Date },
): Promise<void> {
  await db.insert(charmPurchases).values(row)
}

/** Tells whether a league has at least one active Mythic card. */
export async function leagueHasMythic(db: DbExecutor, leagueId: string): Promise<boolean> {
  const rows = await db
    .select({ one: sql<number>`1` })
    .from(cards)
    .where(and(eq(cards.leagueId, leagueId), eq(cards.status, 'active'), eq(cards.tier, 'mythic')))
    .limit(1)
  return rows.length > 0
}
