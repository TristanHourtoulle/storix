import {
  boosterOpeningSchema,
  recentRevealsSchema,
  walletStateSchema,
  type BoosterOpening,
  type RecentReveal,
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

/** Fetches the latest cards pulled in the league. */
export function fetchRecentReveals(leagueId: string): Promise<RecentReveal[]> {
  return apiRequest(`${leaguePath(leagueId)}/reveals`, { schema: recentRevealsSchema })
}
