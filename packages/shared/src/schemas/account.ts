import { z } from 'zod'
import { photosChoiceSchema } from './members'

const leagueRefSchema = z.object({ leagueId: z.uuid(), name: z.string() })

const leagueCardCountSchema = leagueRefSchema.extend({ cardCount: z.int().min(0) })

export const accountDeletionPreviewSchema = z.object({
  blocking: z.array(leagueRefSchema),
  solo: z.array(leagueRefSchema),
  authoredCardCount: z.int().min(0),
  choiceLeagues: z.array(leagueCardCountSchema),
  anonymizedLeagues: z.array(leagueCardCountSchema),
  requiresPassword: z.boolean(),
})

export const deleteAccountBodySchema = z.object({
  confirmUsername: z.string().min(1).max(64),
  password: z.string().min(1).max(128).optional(),
  photos: photosChoiceSchema,
})

export type AccountDeletionPreview = z.infer<typeof accountDeletionPreviewSchema>
export type LeagueCardCount = z.infer<typeof leagueCardCountSchema>
export type DeleteAccountBody = z.infer<typeof deleteAccountBodySchema>
