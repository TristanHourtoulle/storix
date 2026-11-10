import {
  computeBoosterStock,
  MIN_DRAWABLE_CARDS_FOR_BOOSTER,
  pitySummary,
  premiumSummary,
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
      joinGift: cadence.joinGift,
    },
    pool: {
      drawableCount: pool.drawableCount,
      minimumCards: MIN_DRAWABLE_CARDS_FOR_BOOSTER,
      nextEligibleAt: pool.nextEligibleAt === null ? null : pool.nextEligibleAt.toISOString(),
      newCardDelayMinutes: pool.delayMinutes,
    },
    pity: {
      ...pitySummary({ sinceEpic: row.pitySinceEpic, sinceLegendary: row.pitySinceLegendary }),
      epicAvailable: pool.hasEpicOrBetter,
      legendaryAvailable: pool.hasLegendaryOrBetter,
    },
    premium: premiumSummary(row.boostersOpened),
  }
}
