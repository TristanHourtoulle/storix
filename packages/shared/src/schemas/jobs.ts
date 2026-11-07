import { z } from 'zod'

export const MEDIA_PROCESS_JOB = 'media.process'
export const MEDIA_SWEEP_JOB = 'media.sweep-incoming'

export const mediaProcessPayloadSchema = z.object({ uploadId: z.uuid() })

export type MediaProcessPayload = z.infer<typeof mediaProcessPayloadSchema>

export const RARITY_RECOMPUTE_JOB = 'rarity.recompute'
export const RARITY_NIGHTLY_JOB = 'rarity.nightly'

export const rarityRecomputePayloadSchema = z.object({ leagueId: z.uuid() })

export type RarityRecomputePayload = z.infer<typeof rarityRecomputePayloadSchema>

export const RARITY_RECOMPUTE_QUEUE_OPTIONS = { policy: 'stately' } as const

export const RARITY_RECOMPUTE_SEND_OPTIONS = {
  retryLimit: 3,
  retryDelay: 30,
  retryBackoff: true,
} as const

export const STORAGE_DELETE_JOB = 'storage.delete'
export const STORAGE_GC_JOB = 'storage.gc'

export const storageDeletePayloadSchema = z.object({
  keys: z
    .array(z.string().regex(/^(img\/|incoming\/)/))
    .min(1)
    .max(1000),
})

export const STORAGE_DELETE_SEND_OPTIONS = {
  retryLimit: 8,
  retryDelay: 60,
  retryBackoff: true,
} as const

export type StorageDeletePayload = z.infer<typeof storageDeletePayloadSchema>
