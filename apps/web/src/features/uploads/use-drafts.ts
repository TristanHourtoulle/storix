import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ImageSet, UploadDraft } from '@storix/shared'
import { mediaPrefixOfKey, parseMediaPath } from '@storix/shared/domain'
import { purgeMediaPrefixes } from '@/features/privacy/purge-cache'
import { logger } from '@/lib/logger'
import { discardUploads, fetchDrafts } from './uploads.api'
import { uploadQuotaQueryKey } from './use-upload-quota'

const DRAFTS_STALE_MS = 30_000

export function draftsQueryKey(leagueId: string) {
  return ['leagues', leagueId, 'uploads', 'drafts'] as const
}

/** Returns the storage prefixes holding the given signed image sets. */
export function imageSetPrefixes(images: readonly ImageSet[]): string[] {
  const prefixes = images
    .flatMap((image) => [...image.avif, ...image.webp])
    .flatMap((source) => {
      const parsed = parseMediaPath(new URL(source.url, window.location.origin).pathname)
      return parsed ? [mediaPrefixOfKey(parsed.objectKey)] : []
    })
  return [...new Set(prefixes)]
}

/** Returns the storage prefixes holding the images of the given drafts. */
export function draftMediaPrefixes(drafts: readonly UploadDraft[]): string[] {
  return imageSetPrefixes(drafts.flatMap((draft) => (draft.media ? [draft.media.image] : [])))
}

export function draftsQueryOptions(leagueId: string) {
  return queryOptions({
    queryKey: draftsQueryKey(leagueId),
    queryFn: () => fetchDrafts(leagueId),
    staleTime: DRAFTS_STALE_MS,
    refetchOnWindowFocus: true,
  })
}

/** The member's unpublished drafts in a league. */
export function useDrafts(leagueId: string) {
  return useQuery(draftsQueryOptions(leagueId))
}

/** Discards drafts, gives their quota back and purges their cached images. */
export function useDiscardDrafts(leagueId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (drafts: readonly UploadDraft[]): Promise<void> => {
      if (drafts.length === 0) return
      await discardUploads(
        leagueId,
        drafts.map((draft) => draft.uploadId),
      )
    },
    onSuccess: async (_data, drafts) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: draftsQueryKey(leagueId) }),
        queryClient.invalidateQueries({ queryKey: uploadQuotaQueryKey(leagueId) }),
      ])
      const purged = await purgeMediaPrefixes(draftMediaPrefixes(drafts))
      logger.debug('Discarded draft media purged', { purged })
    },
  })
}
