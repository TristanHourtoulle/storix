import {
  whatsNewStateSchema,
  whatsNewTargetsSchema,
  type WhatsNewState,
  type WhatsNewTargets,
} from '@storix/shared'
import { apiRequest } from '@/lib/http'

/** Fetches the member's what's new state: last release seen and the unseen release ids. */
export function fetchWhatsNew(): Promise<WhatsNewState> {
  return apiRequest('/api/whats-new', { schema: whatsNewStateSchema })
}

/** Marks a release (and every older one) as seen; the pointer never moves backwards. */
export function markWhatsNewSeen(releaseId: string): Promise<WhatsNewState> {
  return apiRequest('/api/whats-new/seen', {
    method: 'POST',
    body: { releaseId },
    schema: whatsNewStateSchema,
  })
}

/** Fetches the cards the "Essayer" buttons can link to in a league. */
export function fetchWhatsNewTargets(leagueId: string): Promise<WhatsNewTargets> {
  return apiRequest(`/api/leagues/${encodeURIComponent(leagueId)}/whats-new/targets`, {
    schema: whatsNewTargetsSchema,
  })
}
