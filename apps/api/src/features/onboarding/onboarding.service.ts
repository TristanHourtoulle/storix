import type { Database } from '@storix/db'
import type { OnboardingState } from '@storix/shared'
import type { AuthSession } from '../../auth/auth.gateway'
import { isOnboardingSeen, markOnboardingSeen } from './onboarding.repository'

export interface OnboardingService {
  getState(session: AuthSession): Promise<OnboardingState>
  markSeen(session: AuthSession): Promise<OnboardingState>
}

export interface OnboardingServiceDeps {
  db: Database
  clock: () => Date
}

/** Builds the service tracking whether each account has seen the onboarding stories. */
export function createOnboardingService({ db, clock }: OnboardingServiceDeps): OnboardingService {
  return {
    async getState(session) {
      return { isSeen: await isOnboardingSeen(db, session.userId) }
    },
    async markSeen(session) {
      await markOnboardingSeen(db, { userId: session.userId, now: clock() })
      return { isSeen: true }
    },
  }
}
