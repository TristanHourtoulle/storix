import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { WalletState } from '@storix/shared'
import { walletQueryOptions } from './game.queries'

/** Returns the caller's wallet for a league. */
export function useWallet(leagueId: string): UseQueryResult<WalletState> {
  return useQuery(walletQueryOptions(leagueId))
}
