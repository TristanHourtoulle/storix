import { onboardingStateSchema, type OnboardingState } from '@storix/shared'
import { apiRequest } from '@/lib/http'

/** Fetches whether the account has already seen the onboarding stories. */
export function fetchOnboarding(): Promise<OnboardingState> {
  return apiRequest('/api/onboarding', { schema: onboardingStateSchema })
}

/** Marks the onboarding stories as seen for the account. */
export function markOnboardingSeen(): Promise<OnboardingState> {
  return apiRequest('/api/onboarding/seen', { method: 'POST', schema: onboardingStateSchema })
}
