import { invitations, leagues, user, type DbExecutor } from '@storix/db'
import { and, desc, eq, gt, isNull, lt, sql } from 'drizzle-orm'

export type InvitationRow = typeof invitations.$inferSelect

export type InvitationWithContext = InvitationRow & {
  leagueName: string
  createdByName: string | null
}

/** Inserts an invitation and returns the stored row. */
export async function insertInvitation(
  db: DbExecutor,
  input: {
    leagueId: string
    createdBy: string
    tokenHash: string
    expiresAt: Date
    maxUses: number
  },
): Promise<InvitationRow> {
  const rows = await db.insert(invitations).values(input).returning()
  const row = rows[0]
  if (row === undefined) throw new Error('Invitation insert returned no row')
  return row
}

/** Lists the league's invitations that are neither revoked nor expired, newest first. */
export function listActiveInvitations(
  db: DbExecutor,
  leagueId: string,
  now: Date,
): Promise<InvitationRow[]> {
  return db
    .select()
    .from(invitations)
    .where(
      and(
        eq(invitations.leagueId, leagueId),
        isNull(invitations.revokedAt),
        gt(invitations.expiresAt, now),
      ),
    )
    .orderBy(desc(invitations.createdAt), desc(invitations.id))
}

/** Finds an invitation by token hash with its league name and creator display name. */
export async function findInvitationByTokenHash(
  db: DbExecutor,
  tokenHash: string,
): Promise<InvitationWithContext | null> {
  const rows = await db
    .select({
      invitation: invitations,
      leagueName: leagues.name,
      creatorDisplayUsername: user.displayUsername,
      creatorUsername: user.username,
    })
    .from(invitations)
    .innerJoin(leagues, eq(leagues.id, invitations.leagueId))
    .leftJoin(user, eq(user.id, invitations.createdBy))
    .where(eq(invitations.tokenHash, tokenHash))
    .limit(1)
  const row = rows[0]
  if (row === undefined) return null
  return {
    ...row.invitation,
    leagueName: row.leagueName,
    createdByName: row.creatorDisplayUsername ?? row.creatorUsername ?? null,
  }
}

/** Marks a league's invitation as revoked; false when absent or already revoked. */
export async function revokeInvitation(
  db: DbExecutor,
  leagueId: string,
  invitationId: string,
  now: Date,
): Promise<boolean> {
  const rows = await db
    .update(invitations)
    .set({ revokedAt: now })
    .where(
      and(
        eq(invitations.id, invitationId),
        eq(invitations.leagueId, leagueId),
        isNull(invitations.revokedAt),
      ),
    )
    .returning({ id: invitations.id })
  return rows.length > 0
}

/** Atomically consumes one use of a redeemable invitation; false when none was left. */
export async function consumeInvitationUse(
  db: DbExecutor,
  invitationId: string,
  now: Date,
): Promise<boolean> {
  const rows = await db
    .update(invitations)
    .set({ uses: sql`${invitations.uses} + 1` })
    .where(
      and(
        eq(invitations.id, invitationId),
        isNull(invitations.revokedAt),
        gt(invitations.expiresAt, now),
        lt(invitations.uses, invitations.maxUses),
      ),
    )
    .returning({ id: invitations.id })
  return rows.length > 0
}
