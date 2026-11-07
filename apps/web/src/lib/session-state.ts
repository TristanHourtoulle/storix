let loggingOut = false

/** Flags whether a logout is in progress so 401 handlers do not redirect with a stale target. */
export function setLoggingOut(value: boolean): void {
  loggingOut = value
}

/** True while a logout is in progress. */
export function isLoggingOut(): boolean {
  return loggingOut
}
