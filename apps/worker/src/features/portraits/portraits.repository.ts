import { and, eq, inArray } from 'drizzle-orm'
import { leagueMembers, leagues, portraits, uploads, user, type DbExecutor } from '@storix/db'
import type { LeagueRole, PortraitKind } from '@storix/shared/domain'
import type { UploadStatus } from '@storix/shared'

export { deletePortraitAndUpload, findPortraitForOwner, portraitKeysOf } from '@storix/db'
export { insertAuditEntry, markUploadFailed, markUploadRejected } from '../media/media.repository'

export interface NewPortraitRow {
  kind: PortraitKind
  userId: string | null
  leagueId: string | null
  uploadId: string
  dominantColor: string
}

/** Locks the member row `FOR SHARE` and returns the role, or null when the user is not a member. */
export async function lockMemberRoleForShare(
  db: DbExecutor,
  leagueId: string,
  userId: string,
): Promise<LeagueRole | null> {
  const rows = await db
    .select({ role: leagueMembers.role })
    .from(leagueMembers)
    .where(and(eq(leagueMembers.leagueId, leagueId), eq(leagueMembers.userId, userId)))
    .for('share')
  return rows[0]?.role ?? null
}

/** Locks an upload row `FOR UPDATE` and returns its status, or null when it is gone. */
export async function lockUploadStatus(
  db: DbExecutor,
  uploadId: string,
): Promise<UploadStatus | null> {
  const rows = await db
    .select({ status: uploads.status })
    .from(uploads)
    .where(eq(uploads.id, uploadId))
    .for('update')
  return rows[0]?.status ?? null
}

/** Locks a user row `FOR UPDATE`; false when the account is gone. */
export async function lockUserRow(db: DbExecutor, userId: string): Promise<boolean> {
  const rows = await db.select({ id: user.id }).from(user).where(eq(user.id, userId)).for('update')
  return rows.length > 0
}

/** Locks a league row `FOR UPDATE`; false when the league is gone. */
export async function lockLeagueRow(db: DbExecutor, leagueId: string): Promise<boolean> {
  const rows = await db
    .select({ id: leagues.id })
    .from(leagues)
    .where(eq(leagues.id, leagueId))
    .for('update')
  return rows.length > 0
}

/** Inserts the owner's portrait row. */
export async function insertPortrait(db: DbExecutor, row: NewPortraitRow): Promise<void> {
  await db.insert(portraits).values(row)
}

/** Moves a processing portrait upload to ready; false when it left processing. */
export async function markPortraitUploadReady(
  db: DbExecutor,
  uploadId: string,
  now: Date,
): Promise<boolean> {
  const rows = await db
    .update(uploads)
    .set({ status: 'ready', processedAt: now })
    .where(and(eq(uploads.id, uploadId), inArray(uploads.status, ['processing'])))
    .returning({ id: uploads.id })
  return rows.length > 0
}

/** Tells whether a portrait row was rendered from this upload. */
export async function hasPortraitForUpload(db: DbExecutor, uploadId: string): Promise<boolean> {
  const rows = await db
    .select({ id: portraits.id })
    .from(portraits)
    .where(eq(portraits.uploadId, uploadId))
    .limit(1)
  return rows.length > 0
}
