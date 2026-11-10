import { z } from 'zod'

export const onboardingStateSchema = z.object({ isSeen: z.boolean() })

export type OnboardingState = z.infer<typeof onboardingStateSchema>
