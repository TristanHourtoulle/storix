/** Creates the idempotency key of one booster opening. */
export function newBoosterRequestId(): string {
  return crypto.randomUUID()
}
