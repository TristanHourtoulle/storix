import { user, type DbExecutor } from '@storix/db'
import { and, eq, isNull } from 'drizzle-orm'

export interface UserByUsername {
  id: string
  homeLeagueId: string | null
  displayUsername: string
}

/** Finds a user by username, case-insensitively via the normalized lowercase column. */
export async function findUserByUsername(
  db: DbExecutor,
  username: string,
): Promise<UserByUsername | null> {
  const rows = await db
    .select({
      id: user.id,
      homeLeagueId: user.homeLeagueId,
      username: user.username,
      displayUsername: user.displayUsername,
    })
    .from(user)
    .where(eq(user.username, username.toLowerCase()))
    .limit(1)
  const row = rows[0]
  if (row === undefined) return null
  return {
    id: row.id,
    homeLeagueId: row.homeLeagueId,
    displayUsername: row.displayUsername ?? row.username ?? username,
  }
}

/** Sets the user's home league only when none is set yet. */
export async function setHomeLeagueIfUnset(
  db: DbExecutor,
  userId: string,
  leagueId: string,
): Promise<void> {
  await db
    .update(user)
    .set({ homeLeagueId: leagueId })
    .where(and(eq(user.id, userId), isNull(user.homeLeagueId)))
}

/** Finds a user's home league by user id; null when the user does not exist. */
export async function findUserHomeLeague(
  db: DbExecutor,
  userId: string,
): Promise<{ homeLeagueId: string | null } | null> {
  const rows = await db
    .select({ homeLeagueId: user.homeLeagueId })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
  return rows[0] ?? null
}

/** Reads a user's stored display username and locks the user row for the current transaction. */
export async function lockUserDisplayName(
  db: DbExecutor,
  userId: string,
): Promise<{ username: string | null; displayUsername: string | null } | null> {
  const rows = await db
    .select({ username: user.username, displayUsername: user.displayUsername })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
    .for('update')
  return rows[0] ?? null
}

/** Replaces a user's display username; the login username is left untouched. */
export async function updateUserDisplayName(
  db: DbExecutor,
  input: { userId: string; displayName: string; now: Date },
): Promise<void> {
  await db
    .update(user)
    .set({ displayUsername: input.displayName, updatedAt: input.now })
    .where(eq(user.id, input.userId))
}

/** Finds when a user signed up; null when the user does not exist. */
export async function findMemberSince(db: DbExecutor, userId: string): Promise<Date | null> {
  const rows = await db
    .select({ createdAt: user.createdAt })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1)
  return rows[0]?.createdAt ?? null
}
