import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { RELEASE_NOTES, type ReleaseNote, type WhatsNewState } from '@storix/shared'
import { useCallback, useMemo } from 'react'
import { ApiError } from '@/lib/http'
import { logger } from '@/lib/logger'
import { markWhatsNewSeen } from './whats-new.api'
import { whatsNewQueryOptions } from './whats-new.queries'

interface WhatsNew {
  knownUnseen: ReleaseNote[]
  hasUnseen: boolean
  releases: readonly ReleaseNote[]
  isUnseen: (releaseId: string) => boolean
  markSeen: (releaseId: string) => void
}

function withoutReleaseAndOlder(state: WhatsNewState, releaseId: string): WhatsNewState {
  const releaseIndex = RELEASE_NOTES.findIndex((release) => release.id === releaseId)
  if (releaseIndex < 0) return state
  const olderOrEqual = new Set(RELEASE_NOTES.slice(releaseIndex).map((release) => release.id))
  return {
    seenReleaseId: releaseId,
    unseenReleaseIds: state.unseenReleaseIds.filter((id) => !olderOrEqual.has(id)),
  }
}

/** The member's unseen releases known to this bundle, and an optimistic mark-seen action. */
export function useWhatsNew(): WhatsNew {
  const queryClient = useQueryClient()
  const { queryKey } = whatsNewQueryOptions()
  const { data } = useQuery(whatsNewQueryOptions())

  const unseenIds = useMemo(() => new Set(data?.unseenReleaseIds ?? []), [data])
  const knownUnseen = useMemo(
    () => RELEASE_NOTES.filter((release) => unseenIds.has(release.id)),
    [unseenIds],
  )

  const { mutate } = useMutation({
    mutationFn: markWhatsNewSeen,
    meta: { sound: 'none' },
    onMutate: async (releaseId) => {
      await queryClient.cancelQueries({ queryKey })
      queryClient.setQueryData(queryKey, (state) =>
        state ? withoutReleaseAndOlder(state, releaseId) : state,
      )
    },
    onSuccess: (state) => {
      queryClient.setQueryData(queryKey, state)
    },
    onError: (error, releaseId) => {
      logger.warn('Marking what is new as seen failed', {
        releaseId,
        code: error instanceof ApiError ? error.code : undefined,
        status: error instanceof ApiError ? error.status : undefined,
      })
      void queryClient.invalidateQueries({ queryKey }).catch((refreshError: unknown) => {
        logger.warn('What is new refresh failed', { error: refreshError })
      })
    },
  })

  const isUnseen = useCallback((releaseId: string) => unseenIds.has(releaseId), [unseenIds])
  const markSeen = useCallback((releaseId: string) => mutate(releaseId), [mutate])

  return {
    knownUnseen,
    hasUnseen: knownUnseen.length > 0,
    releases: RELEASE_NOTES,
    isUnseen,
    markSeen,
  }
}
