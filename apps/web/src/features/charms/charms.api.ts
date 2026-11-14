import {
  charmShopResponseSchema,
  purchaseCharmResponseSchema,
  type CharmShopResponse,
  type PurchaseCharmBody,
  type PurchaseCharmResponse,
} from '@storix/shared'
import { apiRequest } from '@/lib/http'

function charmsPath(leagueId: string): string {
  return `/api/leagues/${encodeURIComponent(leagueId)}/charms`
}

/** Fetches the porte-bonheur slot, the weekly purchases and whether the league has a Mythic. */
export function fetchCharmShop(leagueId: string): Promise<CharmShopResponse> {
  return apiRequest(charmsPath(leagueId), { schema: charmShopResponseSchema })
}

/** Buys a charm with the league's paillettes, replacing the active one when `replace` is set. */
export function purchaseCharm(
  leagueId: string,
  body: PurchaseCharmBody,
): Promise<PurchaseCharmResponse> {
  return apiRequest(`${charmsPath(leagueId)}/purchases`, {
    method: 'POST',
    body,
    schema: purchaseCharmResponseSchema,
  })
}
