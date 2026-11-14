import { queryOptions } from '@tanstack/react-query'
import { fetchCharmShop } from './charms.api'

const CHARM_SHOP_STALE_TIME_MS = 15_000

export function charmShopQueryOptions(leagueId: string) {
  return queryOptions({
    queryKey: ['leagues', leagueId, 'charms'],
    queryFn: () => fetchCharmShop(leagueId),
    staleTime: CHARM_SHOP_STALE_TIME_MS,
  })
}
