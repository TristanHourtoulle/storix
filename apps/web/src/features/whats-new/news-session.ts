let autoShownUserId: string | null = null

/** Tells whether the what's new booster was already auto-shown to this member in this app session. */
export function wasAutoShown(userId: string): boolean {
  return autoShownUserId === userId
}

/** Records that the booster was auto-shown to this member, so it never loops in this session. */
export function markAutoShown(userId: string): void {
  autoShownUserId = userId
}
