import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ThemeOverrideBody } from '@storix/shared'
import { showToast } from '@/components/ui/toast'
import { userMessage } from '@/features/errors/user-message'
import { logger } from '@/lib/logger'
import { addCardToSeries, setNextTheme } from './series.api'
import { refreshSeries } from './series.queries'

/** Replaces next week's theme, then refreshes the series views. */
export function useSetNextTheme(leagueId: string, onDone: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: ThemeOverrideBody) => setNextTheme(leagueId, body),
    onSuccess: () => {
      refreshSeries(queryClient, leagueId)
      onDone()
    },
    onError: (error: Error) => {
      logger.warn('Next theme update failed', { error })
      showToast(userMessage(error))
    },
  })
}

/** Adds one of the viewer's cards to a series, then refreshes the card and the series views. */
export function useAddCardToSeries(leagueId: string, cardId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (seriesId: string) => addCardToSeries(leagueId, seriesId, cardId),
    onSuccess: () => {
      refreshSeries(queryClient, leagueId)
      void queryClient
        .invalidateQueries({ queryKey: ['leagues', leagueId, 'cards'] })
        .catch((error: unknown) => logger.warn('Cards refresh failed', { error }))
      showToast('Photo ajoutée au thème')
    },
    onError: (error: Error) => {
      logger.warn('Adding a card to a series failed', { error })
      showToast(userMessage(error))
    },
  })
}
