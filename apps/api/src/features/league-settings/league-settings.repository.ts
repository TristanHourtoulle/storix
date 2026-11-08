import { leagues, memberWallets, type DbExecutor } from '@storix/db'
import type { LeagueSettings } from '@storix/shared'
import { and, eq, isNotNull } from 'drizzle-orm'

export { listRarityInputs, lockLeagueEconomyShared } from '@storix/db'
export { lockLeagueRarity, countMythicPins } from '../moderation/moderation.repository'

/** Replaces the settings column of a league. */
export async function updateLeagueSettings(
  db: DbExecutor,
  leagueId: string,
  settings: LeagueSettings,
): Promise<void> {
  await db.update(leagues).set({ settings }).where(eq(leagues.id, leagueId))
}

/** Re-arms the booster-full notification of every wallet in a league. */
export async function clearBoosterFullNotifications(
  db: DbExecutor,
  leagueId: string,
): Promise<void> {
  await db
    .update(memberWallets)
    .set({ boosterFullNotifiedAt: null })
    .where(
      and(eq(memberWallets.leagueId, leagueId), isNotNull(memberWallets.boosterFullNotifiedAt)),
    )
}
