import {
  boosterOpeningSchema,
  walletStateSchema,
  type BoosterOpening,
  type WalletState,
} from '@storix/shared'
import { apiRequest } from '@/lib/http'

function leaguePath(leagueId: string): string {
  return `/api/leagues/${encodeURIComponent(leagueId)}`
}

/** Fetches the caller's wallet: dust, booster stock and pity counters. */
export function fetchWallet(leagueId: string): Promise<WalletState> {
  return apiRequest(`${leaguePath(leagueId)}/wallet`, { schema: walletStateSchema })
}

/** Opens a booster; idempotent per request id. */
export function openBooster(leagueId: string, requestId: string): Promise<BoosterOpening> {
  return apiRequest(`${leaguePath(leagueId)}/boosters`, {
    method: 'POST',
    body: { requestId },
    schema: boosterOpeningSchema,
  })
}
