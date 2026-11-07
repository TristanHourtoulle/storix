import {
  computeBoosterStock,
  pitySummary,
  type BoosterCadence,
  type WalletState,
} from '@storix/shared'
import type { PoolAvailability } from '../boosters/pool-availability'
import type { WalletRow } from './wallets.repository'

/** Projects a stored wallet to its API state at `now` without persisting the refill. */
export function toWalletState(
  row: WalletRow,
  cadence: BoosterCadence,
  now: Date,
  pool: PoolAvailability,
): WalletState {
  const stock = computeBoosterStock(
    { stock: row.boosterStock, anchor: row.boosterStockAt },
    now,
    cadence,
  )
  return {
    dust: row.dust,
    booster: {
      stock: stock.available,
      maxStock: cadence.maxStock,
      nextAt: stock.nextAt === null ? null : stock.nextAt.toISOString(),
      intervalSeconds: cadence.intervalMinutes * 60,
    },
    pool: {
      drawableCount: pool.drawableCount,
      nextEligibleAt: pool.nextEligibleAt === null ? null : pool.nextEligibleAt.toISOString(),
    },
    pity: {
      ...pitySummary({ sinceEpic: row.pitySinceEpic, sinceLegendary: row.pitySinceLegendary }),
      epicAvailable: pool.hasEpicOrBetter,
      legendaryAvailable: pool.hasLegendaryOrBetter,
    },
  }
}
