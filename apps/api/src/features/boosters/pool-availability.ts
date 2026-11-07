import type { DbExecutor } from '@storix/db'
import { boosterEligibleAt, boosterEligibleBefore } from '@storix/shared'
import { findPoolAvailability } from './boosters.repository'

export interface PoolAvailability {
  drawableCount: number
  hasEpicOrBetter: boolean
  hasLegendaryOrBetter: boolean
  nextEligibleAt: Date | null
}

/** Reads what a booster opened at `now` could draw, and when the next young card becomes drawable. */
export async function loadPoolAvailability(
  db: DbExecutor,
  input: { leagueId: string; now: Date; delayMinutes: number },
): Promise<PoolAvailability> {
  const row = await findPoolAvailability(db, {
    leagueId: input.leagueId,
    eligibleBefore: boosterEligibleBefore(input.now, input.delayMinutes),
  })
  return {
    drawableCount: row.drawableCount,
    hasEpicOrBetter: row.hasEpicOrBetter,
    hasLegendaryOrBetter: row.hasLegendaryOrBetter,
    nextEligibleAt:
      row.nextCreatedAt === null ? null : boosterEligibleAt(row.nextCreatedAt, input.delayMinutes),
  }
}
