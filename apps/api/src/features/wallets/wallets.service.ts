import type { Database } from '@storix/db'
import { resolveLeagueSettings, type WalletState } from '@storix/shared'
import { findLeagueSettings } from '../leagues/leagues.repository'
import type { Membership } from '../leagues/leagues.service'
import { toWalletState } from './wallet-state'
import { ensureWallet, findWallet } from './wallets.repository'

export interface WalletsService {
  getWallet(membership: Membership): Promise<WalletState>
}

export interface WalletsServiceDeps {
  db: Database
  clock: () => Date
}

/** Builds the service exposing member wallets with their lazily computed booster stock. */
export function createWalletsService({ db, clock }: WalletsServiceDeps): WalletsService {
  return {
    async getWallet(membership) {
      const now = clock()
      const { booster } = resolveLeagueSettings(await findLeagueSettings(db, membership.leagueId))
      const key = { leagueId: membership.leagueId, userId: membership.userId }
      await ensureWallet(db, { ...key, joinGift: booster.joinGift, now })
      const row = await findWallet(db, key.leagueId, key.userId)
      if (row === null) throw new Error('Member wallet missing after creation')
      return toWalletState(row, booster, now)
    },
  }
}
