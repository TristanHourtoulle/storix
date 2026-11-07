import {
  leagueSettingsViewSchema,
  rarityPreviewSchema,
  type LeagueSettingsView,
  type RarityPreview,
  type UpdateLeagueSettingsBody,
} from '@storix/shared'
import { apiRequest } from '@/lib/http'

function settingsPath(leagueId: string): string {
  return `/api/leagues/${encodeURIComponent(leagueId)}/settings`
}

/** Fetches the league settings and the Mythic count. */
export function fetchSettings(leagueId: string): Promise<LeagueSettingsView> {
  return apiRequest(settingsPath(leagueId), { schema: leagueSettingsViewSchema })
}

/** Replaces the league settings. */
export function saveSettings(
  leagueId: string,
  body: UpdateLeagueSettingsBody,
): Promise<LeagueSettingsView> {
  return apiRequest(settingsPath(leagueId), {
    method: 'PUT',
    body,
    schema: leagueSettingsViewSchema,
  })
}

/** Computes how the tier distribution would change under the given rarity weights. */
export function fetchRarityPreview(
  leagueId: string,
  weights: UpdateLeagueSettingsBody['rarityWeights'],
  signal?: AbortSignal,
): Promise<RarityPreview> {
  return apiRequest(`${settingsPath(leagueId)}/rarity-preview`, {
    method: 'POST',
    body: { rarityWeights: weights },
    schema: rarityPreviewSchema,
    signal,
  })
}
