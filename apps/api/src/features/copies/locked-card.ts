import type { Database, DbExecutor } from '@storix/db'
import { resolveLeagueSettings, type DustBalance } from '@storix/shared'
import { AppError, notFound } from '../../lib/errors'
import { runInTransaction } from '../../lib/transaction'
import { findCardForViewer, type CardViewerRow } from '../cards/cards.repository'
import { findLeagueSettings } from '../leagues/leagues.repository'
import type { Membership } from '../leagues/leagues.service'
import {
  ensureWallet,
  lockWallet,
  updateWallet,
  type WalletRow,
} from '../wallets/wallets.repository'

export interface LockedContext {
  tx: DbExecutor
  m: Membership
  wallet: WalletRow
  card: CardViewerRow
  now: Date
  delayMinutes: number
}

export interface LockedCardDeps {
  db: Database
  clock: () => Date
}

/** Returns the error raised when the member does not own the copy they act on. */
export function copyNotOwned(): AppError {
  return new AppError('COPY_NOT_OWNED', 409, 'You do not own this copy')
}

/** Writes the member's new dust balance and returns it. */
export async function setDust(ctx: LockedContext, dust: number): Promise<DustBalance> {
  await updateWallet(ctx.tx, { leagueId: ctx.m.leagueId, userId: ctx.m.userId }, { dust })
  return { dust }
}

/** Runs `fn` in a transaction holding the member wallet lock, on an active card of the league. */
export function withLockedCard<T>(
  { db, clock }: LockedCardDeps,
  m: Membership,
  cardId: string,
  fn: (ctx: LockedContext) => Promise<T>,
): Promise<T> {
  return runInTransaction(db, async (tx) => {
    const now = clock()
    const { booster, newCardDelayMinutes } = resolveLeagueSettings(
      await findLeagueSettings(tx, m.leagueId),
    )
    await ensureWallet(tx, {
      leagueId: m.leagueId,
      userId: m.userId,
      cadence: booster,
      now,
    })
    const wallet = await lockWallet(tx, m.leagueId, m.userId)
    const card = await findCardForViewer(tx, {
      leagueId: m.leagueId,
      cardId,
      viewerId: m.userId,
    })
    if (card === null || card.status !== 'active') throw notFound('Card not found')
    return fn({ tx, m, wallet, card, now, delayMinutes: newCardDelayMinutes })
  })
}
