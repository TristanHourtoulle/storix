import { z } from 'zod'

const leagueRefSchema = z.object({ leagueId: z.uuid(), name: z.string() })

export const accountDeletionPreviewSchema = z.object({
  blocking: z.array(leagueRefSchema),
  solo: z.array(leagueRefSchema),
  authoredCardCount: z.int().min(0),
  requiresPassword: z.boolean(),
})

export const deleteAccountBodySchema = z.object({
  confirmUsername: z.string().min(1).max(64),
  password: z.string().min(1).max(128).optional(),
})

export type AccountDeletionPreview = z.infer<typeof accountDeletionPreviewSchema>
export type DeleteAccountBody = z.infer<typeof deleteAccountBodySchema>
