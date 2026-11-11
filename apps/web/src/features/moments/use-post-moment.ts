import { useMutation, useQueryClient } from '@tanstack/react-query'
import { UPLOAD_CONTENT_TYPE, type PostMomentResponse } from '@storix/shared'
import { walletQueryOptions } from '@/features/game/game.queries'
import { refreshMissions } from '@/features/missions/missions.queries'
import { viewfinderCaptureDate } from '@/features/uploads/camera/capture'
import { postToBucket } from '@/features/uploads/uploads.api'
import { createMomentUploads, postMoment } from './moments.api'
import { currentMomentQueryKey } from './moments.queries'

interface MomentFiles {
  back: File
  front: File
}

/** Sends both photos of a Moment to the bucket, then posts it and refreshes what it rewards. */
export function usePostMoment(leagueId: string) {
  const queryClient = useQueryClient()
  return useMutation<PostMomentResponse, Error, MomentFiles>({
    mutationFn: async ({ back, front }) => {
      const uploads = await createMomentUploads(leagueId, {
        back: { contentType: UPLOAD_CONTENT_TYPE, size: back.size },
        selfie: { contentType: UPLOAD_CONTENT_TYPE, size: front.size },
      })
      await Promise.all([postToBucket(uploads.back, back), postToBucket(uploads.selfie, front)])
      return postMoment(leagueId, {
        backUploadId: uploads.back.uploadId,
        selfieUploadId: uploads.selfie.uploadId,
        capturedAt: viewfinderCaptureDate(back),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: currentMomentQueryKey(leagueId) })
      void queryClient.invalidateQueries({ queryKey: walletQueryOptions(leagueId).queryKey })
      void queryClient.invalidateQueries({ queryKey: ['leagues', leagueId, 'cards'] })
      refreshMissions(queryClient, leagueId)
    },
  })
}
