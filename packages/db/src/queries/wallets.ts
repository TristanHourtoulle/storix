import { and, eq, inArray, notExists, sql } from 'drizzle-orm'
import { resolveLeagueSettings } from '@storix/shared'
import { computeBoosterFullAt, type BoosterCadence } from '@storix/shared/domain'
import type { DbExecutor } from '../client'
import { leagueMembers, leagues, memberWallets } from '../schema/index'

/** Builds a fresh wallet row holding the joining gift, already marked as notified when the gift fills the stock. */
export function newWalletValues(input: {
  leagueId: string
  userId: string
  cadence: BoosterCadence
  now: Date
}): typeof memberWallets.$inferInsert {
  const { cadence, now } = input
  const fullAt = computeBoosterFullAt({ stock: cadence.joinGift, anchor: now }, cadence)
  return {
    leagueId: input.leagueId,
    userId: input.userId,
    boosterStock: cadence.joinGift,
    boosterStockAt: now,
    boosterFullNotifiedAt: fullAt.getTime() <= now.getTime() ? now : null,
  }
}

async function findLeagueCadence(db: DbExecutor, leagueId: string): Promise<BoosterCadence> {
  const [row] = await db
    .select({ settings: leagues.settings })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .limit(1)
  return resolveLeagueSettings(row?.settings ?? null).booster
}

/**
 * Creates the missing wallets of current league members, with the league's joining gift, leaving existing ones untouched.
 * Covers every member when `userIds` is omitted.
 */
export async function ensureMemberWallets(
  db: DbExecutor,
  input: { leagueId: string; userIds?: readonly string[]; now: Date },
): Promise<void> {
  if (input.userIds !== undefined && input.userIds.length === 0) return
  const missing = await db
    .select({ userId: leagueMembers.userId })
    .from(leagueMembers)
    .where(
      and(
        eq(leagueMembers.leagueId, input.leagueId),
        input.userIds === undefined ? undefined : inArray(leagueMembers.userId, [...input.userIds]),
        notExists(
          db
            .select({ one: sql`1` })
            .from(memberWallets)
            .where(
              and(
                eq(memberWallets.leagueId, leagueMembers.leagueId),
                eq(memberWallets.userId, leagueMembers.userId),
              ),
            ),
        ),
      ),
    )
  if (missing.length === 0) return
  const cadence = await findLeagueCadence(db, input.leagueId)
  await db
    .insert(memberWallets)
    .values(
      missing.map((member) =>
        newWalletValues({
          leagueId: input.leagueId,
          userId: member.userId,
          cadence,
          now: input.now,
        }),
      ),
    )
    .onConflictDoNothing()
}
