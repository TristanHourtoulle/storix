let isAutoShown = false

/** Tells whether the what's new booster was already auto-shown in this app session. */
export function wasAutoShown(): boolean {
  return isAutoShown
}

/** Records that the what's new booster was auto-shown, so it never loops in this session. */
export function markAutoShown(): void {
  isAutoShown = true
}
