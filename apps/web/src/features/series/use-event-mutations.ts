import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { EventBody, EventPatch } from '@storix/shared'
import { showToast } from '@/components/ui/toast'
import { userMessage } from '@/features/errors/user-message'
import { logger } from '@/lib/logger'
import { cancelEvent, createEvent, endEvent, updateEvent } from './events.api'
import { refreshSeries } from './series.queries'

type EventChange =
  | { type: 'create'; body: EventBody }
  | { type: 'update'; seriesId: string; patch: EventPatch }
  | { type: 'cancel'; seriesId: string }
  | { type: 'end'; seriesId: string }

const DONE_MESSAGES: Readonly<Record<EventChange['type'], string>> = {
  create: 'Événement programmé',
  update: 'Événement modifié',
  cancel: 'Événement annulé',
  end: 'Événement terminé : 12 h pour ajouter les photos',
}

function run(leagueId: string, change: EventChange): Promise<unknown> {
  switch (change.type) {
    case 'create':
      return createEvent(leagueId, change.body)
    case 'update':
      return updateEvent(leagueId, change.seriesId, change.patch)
    case 'cancel':
      return cancelEvent(leagueId, change.seriesId)
    case 'end':
      return endEvent(leagueId, change.seriesId)
  }
}

/** Creates, edits, cancels or ends an event, then refreshes every series view of the league. */
export function useEventChange(leagueId: string, onDone?: () => void) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (change: EventChange) => run(leagueId, change),
    onSuccess: (_result, change) => {
      refreshSeries(queryClient, leagueId)
      showToast(DONE_MESSAGES[change.type])
      onDone?.()
    },
    onError: (error: Error) => {
      logger.warn('Event change failed', { error })
      showToast(userMessage(error))
    },
  })
}
