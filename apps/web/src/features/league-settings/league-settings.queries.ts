import { keepPreviousData, queryOptions } from '@tanstack/react-query'
import type { UpdateLeagueSettingsBody } from '@storix/shared'
import { fetchRarityPreview, fetchSettings } from './league-settings.api'

export type RarityWeights = UpdateLeagueSettingsBody['rarityWeights']

export function settingsQueryKey(leagueId: string) {
  return ['leagues', leagueId, 'settings'] as const
}

export function settingsQueryOptions(leagueId: string) {
  return queryOptions({
    queryKey: settingsQueryKey(leagueId),
    queryFn: () => fetchSettings(leagueId),
  })
}

export function rarityPreviewQueryOptions(leagueId: string, weights: RarityWeights) {
  return queryOptions({
    queryKey: [...settingsQueryKey(leagueId), 'preview', weights],
    queryFn: ({ signal }) => fetchRarityPreview(leagueId, weights, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  })
}
