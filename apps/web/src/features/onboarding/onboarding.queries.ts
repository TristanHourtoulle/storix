import { queryOptions } from '@tanstack/react-query'
import { fetchOnboarding } from './onboarding.api'

export function onboardingQueryOptions() {
  return queryOptions({
    queryKey: ['onboarding'],
    queryFn: fetchOnboarding,
    staleTime: Infinity,
  })
}
