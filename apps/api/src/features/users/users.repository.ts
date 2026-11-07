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
