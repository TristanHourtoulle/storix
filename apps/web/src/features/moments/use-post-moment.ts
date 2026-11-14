import { useCallback, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateMomentUploadsResponse, PostMomentResponse } from '@storix/shared'
import { walletQueryOptions } from '@/features/game/game.queries'
import { refreshMissions } from '@/features/missions/missions.queries'
import { viewfinderCaptureDate } from '@/features/uploads/camera/capture'
import { postToBucket } from '@/features/uploads/uploads.api'
import { createMomentUploads, postMoment } from './moments.api'
import { currentMomentQueryKey } from './moments.queries'

interface MomentSubmission {
  back: File
  front: File
  title: string
  seriesIds: readonly string[]
}

/**
 * Reserves the Moment uploads when the back photo is taken (the server stamps that instant as the capture
 * time), sends both photos to the bucket on publish, then posts the Moment with its optional title and
 * refreshes what it touches.
 */
export function usePostMoment(leagueId: string) {
  const queryClient = useQueryClient()
  const reservationRef = useRef<Promise<CreateMomentUploadsResponse> | null>(null)

  const reserve = useCallback(() => {
    const reservation = createMomentUploads(leagueId)
    reservation.catch(() => {
      if (reservationRef.current === reservation) reservationRef.current = null
    })
    reservationRef.current = reservation
  }, [leagueId])

  const mutation = useMutation<PostMomentResponse, Error, MomentSubmission>({
    mutationFn: async ({ back, front, title, seriesIds }) => {
      const uploads = await (reservationRef.current ?? createMomentUploads(leagueId))
      await Promise.all([postToBucket(uploads.back, back), postToBucket(uploads.selfie, front)])
      const trimmedTitle = title.trim()
      return postMoment(leagueId, {
        backUploadId: uploads.back.uploadId,
        selfieUploadId: uploads.selfie.uploadId,
        capturedAt: viewfinderCaptureDate(back),
        ...(trimmedTitle === '' ? {} : { title: trimmedTitle }),
        ...(seriesIds.length === 0 ? {} : { seriesIds: [...seriesIds] }),
      })
    },
    onError: () => {
      reservationRef.current = null
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: currentMomentQueryKey(leagueId) })
      void queryClient.invalidateQueries({ queryKey: walletQueryOptions(leagueId).queryKey })
      void queryClient.invalidateQueries({ queryKey: ['leagues', leagueId, 'cards'] })
      refreshMissions(queryClient, leagueId)
      void queryClient.invalidateQueries({ queryKey: ['leagues', leagueId, 'series'] })
    },
  })

  return { ...mutation, reserve }
}
