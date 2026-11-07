import { z } from 'zod'

export const MEDIA_PROCESS_JOB = 'media.process'
export const MEDIA_SWEEP_JOB = 'media.sweep-incoming'

export const mediaProcessPayloadSchema = z.object({ uploadId: z.uuid() })

export type MediaProcessPayload = z.infer<typeof mediaProcessPayloadSchema>

export const RARITY_RECOMPUTE_JOB = 'rarity.recompute'
export const RARITY_NIGHTLY_JOB = 'rarity.nightly'

export const rarityRecomputePayloadSchema = z.object({ leagueId: z.uuid() })

export type RarityRecomputePayload = z.infer<typeof rarityRecomputePayloadSchema>
