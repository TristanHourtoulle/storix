import { leagues, type DbExecutor } from '@storix/db'
import type { LeagueSettings } from '@storix/shared'
import { eq } from 'drizzle-orm'

export { listRarityInputs } from '@storix/db'
export { lockLeagueRarity, countMythicPins } from '../moderation/moderation.repository'

/** Replaces the settings column of a league. */
export async function updateLeagueSettings(
  db: DbExecutor,
  leagueId: string,
  settings: LeagueSettings,
): Promise<void> {
  await db.update(leagues).set({ settings }).where(eq(leagues.id, leagueId))
}
