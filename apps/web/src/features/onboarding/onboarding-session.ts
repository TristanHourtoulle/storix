let shownUserId: string | null = null

/** Tells whether the onboarding stories were already shown to this account in this app session. */
export function wasOnboardingShown(userId: string): boolean {
  return shownUserId === userId
}

/** Records that the onboarding stories were shown to this account, so they never loop in this session. */
export function markOnboardingShown(userId: string): void {
  shownUserId = userId
}
