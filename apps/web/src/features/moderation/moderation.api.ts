import {
  adminCardPageSchema,
  adminCardSchema,
  type AdminCard,
  type AdminCardPage,
  type CardTier,
  type ComputedTier,
} from '@storix/shared'
import { apiRequest, apiRequestVoid } from '@/lib/http'
import type { AdminFilter } from './moderation.types'

function adminCardsPath(leagueId: string): string {
  return `/api/leagues/${encodeURIComponent(leagueId)}/admin/cards`
}

function adminCardPath(leagueId: string, cardId: string): string {
  return `${adminCardsPath(leagueId)}/${encodeURIComponent(cardId)}`
}

/** Fetches one page of the admin card list, newest first. */
export function fetchAdminCards(
  leagueId: string,
  filter: AdminFilter,
  cursor: number | undefined,
): Promise<AdminCardPage> {
  const query = new URLSearchParams({ filter })
  if (cursor !== undefined) query.set('cursor', String(cursor))
  return apiRequest(`${adminCardsPath(leagueId)}?${query.toString()}`, {
    schema: adminCardPageSchema,
  })
}

/** Hides or restores a card. */
export function patchVisibility(
  leagueId: string,
  cardId: string,
  status: AdminCard['status'],
): Promise<AdminCard> {
  return apiRequest(`${adminCardPath(leagueId, cardId)}/visibility`, {
    method: 'PATCH',
    body: { status },
    schema: adminCardSchema,
  })
}

/** Pins a card to a tier, or clears the pin with null. */
export function putTierPin(
  leagueId: string,
  cardId: string,
  tier: CardTier | null,
): Promise<AdminCard> {
  return apiRequest(`${adminCardPath(leagueId, cardId)}/tier-pin`, {
    method: 'PUT',
    body: { tier },
    schema: adminCardSchema,
  })
}

/** Sets the minimum and maximum computed tiers of a card. */
export function putTierBounds(
  leagueId: string,
  cardId: string,
  bounds: { min: ComputedTier | null; max: ComputedTier | null },
): Promise<AdminCard> {
  return apiRequest(`${adminCardPath(leagueId, cardId)}/tier-bounds`, {
    method: 'PUT',
    body: bounds,
    schema: adminCardSchema,
  })
}

/** Marks the capture date of a card as verified or not. */
export function putCaptureDate(
  leagueId: string,
  cardId: string,
  isValidated: boolean,
): Promise<AdminCard> {
  return apiRequest(`${adminCardPath(leagueId, cardId)}/capture-date`, {
    method: 'PUT',
    body: { isValidated },
    schema: adminCardSchema,
  })
}

/** Permanently deletes a card from the league. */
export function removeCard(leagueId: string, cardId: string): Promise<void> {
  return apiRequestVoid(adminCardPath(leagueId, cardId), { method: 'DELETE' })
}
