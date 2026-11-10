import { onboardingReads, type DbExecutor } from '@storix/db'
import { eq } from 'drizzle-orm'

/** Returns true when the user already went through the onboarding stories. */
export async function isOnboardingSeen(db: DbExecutor, userId: string): Promise<boolean> {
  const rows = await db
    .select({ userId: onboardingReads.userId })
    .from(onboardingReads)
    .where(eq(onboardingReads.userId, userId))
    .limit(1)
  return rows.length > 0
}

/** Records that the user has seen the onboarding stories, keeping the first time on repeats. */
export async function markOnboardingSeen(
  db: DbExecutor,
  input: { userId: string; now: Date },
): Promise<void> {
  await db
    .insert(onboardingReads)
    .values({ userId: input.userId, seenAt: input.now, updatedAt: input.now })
    .onConflictDoNothing()
}
