import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { OnboardingState } from '@storix/shared'
import { useCallback } from 'react'
import { ApiError } from '@/lib/http'
import { logger } from '@/lib/logger'
import { markOnboardingSeen } from './onboarding.api'
import { onboardingQueryOptions } from './onboarding.queries'

interface Onboarding {
  isPending: boolean
  isSeen: boolean
  markSeen: () => void
}

const SEEN: OnboardingState = { isSeen: true }

/** The account's onboarding seen flag, and an optimistic mark-seen action. */
export function useOnboarding(): Onboarding {
  const queryClient = useQueryClient()
  const { queryKey } = onboardingQueryOptions()
  const { data, isPending } = useQuery(onboardingQueryOptions())

  const { mutate } = useMutation({
    mutationFn: markOnboardingSeen,
    meta: { sound: 'none' },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey })
      queryClient.setQueryData(queryKey, SEEN)
    },
    onSuccess: (state) => {
      queryClient.setQueryData(queryKey, state)
    },
    onError: (error) => {
      logger.error('Marking onboarding as seen failed', {
        code: error instanceof ApiError ? error.code : undefined,
        status: error instanceof ApiError ? error.status : undefined,
      })
      void queryClient.invalidateQueries({ queryKey }).catch((refreshError: unknown) => {
        logger.warn('Onboarding refresh failed', { error: refreshError })
      })
    },
  })

  const markSeen = useCallback(() => mutate(), [mutate])

  return { isPending, isSeen: data?.isSeen ?? false, markSeen }
}
