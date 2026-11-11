import {
  equippedCosmeticsSchema,
  myCosmeticsResponseSchema,
  purchaseCosmeticResponseSchema,
  tryOnCardsResponseSchema,
  type EquipCosmeticBody,
  type EquippedCosmetics,
  type MyCosmeticsResponse,
  type PurchaseCosmeticBody,
  type PurchaseCosmeticResponse,
  type TryOnCardsResponse,
} from '@storix/shared'
import { apiRequest } from '@/lib/http'

function leaguePath(leagueId: string): string {
  return `/api/leagues/${encodeURIComponent(leagueId)}`
}

/** Fetches the cosmetics the viewer owns and the ones they wear, account-wide. */
export function fetchMyCosmetics(): Promise<MyCosmeticsResponse> {
  return apiRequest('/api/me/cosmetics', { schema: myCosmeticsResponseSchema })
}

/** Wears an owned item in its slot, or the original style when `itemId` is null. */
export function equipCosmetic(body: EquipCosmeticBody): Promise<EquippedCosmetics> {
  return apiRequest('/api/me/cosmetics/equipped', {
    method: 'PUT',
    body,
    schema: equippedCosmeticsSchema,
  })
}

/** Buys an item with the paillettes of the given league. */
export function purchaseCosmetic(
  leagueId: string,
  body: PurchaseCosmeticBody,
): Promise<PurchaseCosmeticResponse> {
  return apiRequest(`${leaguePath(leagueId)}/cosmetics/purchases`, {
    method: 'POST',
    body,
    schema: purchaseCosmeticResponseSchema,
  })
}

/** Fetches up to six of the viewer's own cards to preview a rarity set on. */
export function fetchTryOnCards(leagueId: string): Promise<TryOnCardsResponse> {
  return apiRequest(`${leaguePath(leagueId)}/cosmetics/try-on-cards`, {
    schema: tryOnCardsResponseSchema,
  })
}
