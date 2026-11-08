import {
  type BoosterCadence,
  type BoosterStockState,
  InvalidBoosterCadenceError,
} from './booster-stock'

/** Returns the instant the stock reaches `maxStock`; the anchor itself when the stored stock is already full or above. */
export function computeBoosterFullAt(
  state: BoosterStockState,
  cadence: Pick<BoosterCadence, 'intervalMinutes' | 'maxStock'>,
): Date {
  if (cadence.intervalMinutes < 1 || cadence.maxStock < 1) throw new InvalidBoosterCadenceError()
  if (state.stock >= cadence.maxStock) return state.anchor
  const missing = cadence.maxStock - state.stock
  return new Date(state.anchor.getTime() + missing * cadence.intervalMinutes * 60_000)
}

/** True when the wallet is armed (no marker) and its fill instant has passed. */
export function isBoosterFullNotificationDue(input: {
  fullAt: Date
  now: Date
  notifiedAt: Date | null
}): boolean {
  return input.notifiedAt === null && input.now.getTime() >= input.fullAt.getTime()
}

/** True when a settings change raises the max stock, so every wallet of the league must be re-armed. */
export function shouldRearmBoosterFullNotifications(
  from: Pick<BoosterCadence, 'maxStock'>,
  to: Pick<BoosterCadence, 'maxStock'>,
): boolean {
  return to.maxStock > from.maxStock
}

/** French notification body for a full booster stock in a league. */
export function boosterFullNotificationBody(leagueName: string, count: number): string {
  if (count === 1) return `${leagueName} : 1 booster t'attend`
  return `${leagueName} : ${count} boosters t'attendent`
}
