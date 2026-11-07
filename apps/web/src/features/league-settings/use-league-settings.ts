import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import type { LeagueSettingsView, UpdateLeagueSettingsBody } from '@storix/shared'
import { userMessage } from '@/features/errors/user-message'
import { walletQueryOptions } from '@/features/game/game.queries'
import { uploadQuotaQueryKey } from '@/features/uploads/use-upload-quota'
import { ApiError } from '@/lib/http'
import { logger } from '@/lib/logger'
import { saveSettings } from './league-settings.api'
import { fieldErrorsFromDetails, type FieldErrors } from './settings-errors'
import { settingsQueryKey, settingsQueryOptions } from './league-settings.queries'

interface LeagueSettings {
  view: LeagueSettingsView
  save: (body: UpdateLeagueSettingsBody) => void
  isSaving: boolean
  isSaved: boolean
  reset: () => void
  serverFieldErrors: FieldErrors
  errorMessage: string | null
}

/** Admin league settings with a save mutation that refreshes dependent caches. */
export function useLeagueSettings(leagueId: string): LeagueSettings {
  const queryClient = useQueryClient()
  const { data: view } = useSuspenseQuery(settingsQueryOptions(leagueId))
  const mutation = useMutation({
    mutationFn: (body: UpdateLeagueSettingsBody) => saveSettings(leagueId, body),
    onSuccess: (next) => {
      queryClient.setQueryData(settingsQueryKey(leagueId), next)
      void queryClient.invalidateQueries({ queryKey: walletQueryOptions(leagueId).queryKey })
      void queryClient.invalidateQueries({ queryKey: uploadQuotaQueryKey(leagueId) })
    },
    onError: (error) => {
      if (!(error instanceof ApiError) || error.code !== 'VALIDATION_FAILED') {
        logger.error('Saving league settings failed', { error })
      }
    },
  })

  return {
    view,
    save: mutation.mutate,
    isSaving: mutation.isPending,
    isSaved: mutation.isSuccess,
    reset: mutation.reset,
    serverFieldErrors:
      mutation.error instanceof ApiError ? fieldErrorsFromDetails(mutation.error.details) : {},
    errorMessage: mutation.error ? userMessage(mutation.error) : null,
  }
}
