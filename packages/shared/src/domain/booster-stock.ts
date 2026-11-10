export interface BoosterCadence {
  intervalMinutes: number
  maxStock: number
  joinGift: number
}

export const DEFAULT_BOOSTER_CADENCE: BoosterCadence = {
  intervalMinutes: 240,
  maxStock: 6,
  joinGift: 2,
}

export interface BoosterStockState {
  stock: number
  anchor: Date
}

export class InvalidBoosterCadenceError extends Error {
  constructor() {
    super('Booster cadence requires intervalMinutes >= 1 and maxStock >= 1')
    this.name = 'InvalidBoosterCadenceError'
  }
}

/** Computes the boosters available at `now` from the stored stock and its refill anchor, never above the max stock. */
export function computeBoosterStock(
  state: BoosterStockState,
  now: Date,
  cadence: BoosterCadence,
): { available: number; anchor: Date; nextAt: Date | null } {
  if (cadence.intervalMinutes < 1 || cadence.maxStock < 1) throw new InvalidBoosterCadenceError()
  if (state.stock >= cadence.maxStock) {
    return { available: cadence.maxStock, anchor: now, nextAt: null }
  }
  const intervalMs = cadence.intervalMinutes * 60_000
  const elapsed = Math.max(0, Math.floor((now.getTime() - state.anchor.getTime()) / intervalMs))
  const available = Math.min(cadence.maxStock, state.stock + elapsed)
  if (available === cadence.maxStock) return { available, anchor: now, nextAt: null }
  const anchor = new Date(state.anchor.getTime() + elapsed * intervalMs)
  return { available, anchor, nextAt: new Date(anchor.getTime() + intervalMs) }
}

/** Returns the stock state after opening one booster at `now`, or null when none is available. */
export function consumeBooster(
  state: BoosterStockState,
  now: Date,
  cadence: BoosterCadence,
): BoosterStockState | null {
  const computed = computeBoosterStock(state, now, cadence)
  if (computed.available < 1) return null
  return { stock: computed.available - 1, anchor: computed.anchor }
}

export const BOOSTER_SOURCES = ['timer', 'bonus', 'premium_gift'] as const

export type BoosterSource = (typeof BOOSTER_SOURCES)[number]

/** Picks where the next booster comes from: a premium gift first, then the timed stock, then the bonus reserve. */
export function pickBoosterSource(state: {
  premiumGifts: number
  availableStock: number
  bonus: number
}): BoosterSource | null {
  if (state.premiumGifts > 0) return 'premium_gift'
  if (state.availableStock > 0) return 'timer'
  if (state.bonus > 0) return 'bonus'
  return null
}
