import { auditLog, leagueMembers, user, type AuditAction, type DbExecutor } from '@storix/db'
import type { AuditCursor } from '@storix/shared'
import { and, desc, eq, gt, gte, inArray, isNull, or, sql, type SQL } from 'drizzle-orm'

export interface AuditEntry {
  leagueId: string | null
  actorId: string | null
  targetUserId: string | null
  action: AuditAction
  metadata?: Record<string, unknown>
}

export interface AuditRow {
  id: string
  action: AuditAction
  actorId: string | null
  targetUserId: string | null
  metadata: Record<string, unknown>
  createdAt: Date
}

export interface AuditPersonRow {
  userId: string
  displayUsername: string | null
  isMember: boolean
}

const createdAtMs = sql`date_trunc('milliseconds', ${auditLog.createdAt})`

/** Appends an entry to the audit log. */
export async function insertAuditEntry(db: DbExecutor, entry: AuditEntry): Promise<void> {
  await db.insert(auditLog).values({
    leagueId: entry.leagueId,
    actorId: entry.actorId,
    targetUserId: entry.targetUserId,
    action: entry.action,
    metadata: entry.metadata ?? {},
  })
}

export interface AuditFilter {
  leagueId: string
  actions: readonly AuditAction[]
  accountActions: readonly AuditAction[]
  memberId?: string
  from: Date
}

export interface AuditKeyRow {
  id: string
  action: AuditAction
  targetUserId: string | null
  createdAt: Date
}

const MAX_COUNTED_ROWS = 10_000

function auditWhere(db: DbExecutor, input: AuditFilter): SQL | undefined {
  const members = db
    .select({ userId: leagueMembers.userId })
    .from(leagueMembers)
    .where(eq(leagueMembers.leagueId, input.leagueId))
  const accountRows =
    input.accountActions.length === 0
      ? undefined
      : and(
          isNull(auditLog.leagueId),
          inArray(auditLog.action, [...input.accountActions]),
          inArray(auditLog.actorId, members),
        )
  return and(
    or(eq(auditLog.leagueId, input.leagueId), accountRows),
    inArray(auditLog.action, [...input.actions]),
    input.memberId === undefined
      ? undefined
      : or(eq(auditLog.actorId, input.memberId), eq(auditLog.targetUserId, input.memberId)),
    gte(auditLog.createdAt, input.from),
  )
}

/**
 * Lists a league's audit rows newest first, plus league-less account rows of its current members,
 * fetching `limit` rows after the cursor. A member filter keeps rows they did or that concern them.
 */
export async function listAuditPage(
  db: DbExecutor,
  input: AuditFilter & { after?: AuditCursor; limit: number },
): Promise<AuditRow[]> {
  if (input.actions.length === 0) return []
  const after =
    input.after === undefined
      ? undefined
      : sql`(${createdAtMs}, ${auditLog.id}) < (${new Date(input.after.createdAtMs).toISOString()}::timestamptz, ${input.after.id}::uuid)`
  return db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      actorId: auditLog.actorId,
      targetUserId: auditLog.targetUserId,
      metadata: auditLog.metadata,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(and(auditWhere(db, input), after))
    .orderBy(desc(createdAtMs), desc(auditLog.id))
    .limit(input.limit)
}

/** Lists the keys of every audit row matching the filter, newest first, to count Journal lines. */
export async function listAuditKeys(db: DbExecutor, input: AuditFilter): Promise<AuditKeyRow[]> {
  if (input.actions.length === 0) return []
  return db
    .select({
      id: auditLog.id,
      action: auditLog.action,
      targetUserId: auditLog.targetUserId,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(auditWhere(db, input))
    .orderBy(desc(createdAtMs), desc(auditLog.id))
    .limit(MAX_COUNTED_ROWS)
}

/** Resolves people names and whether each is still a member of the league. */
export async function listAuditPeople(
  db: DbExecutor,
  input: { leagueId: string; userIds: readonly string[] },
): Promise<AuditPersonRow[]> {
  if (input.userIds.length === 0) return []
  return db
    .select({
      userId: user.id,
      displayUsername: sql<
        string | null
      >`coalesce(${user.displayUsername}, ${user.username}, ${user.name})`,
      isMember: sql<boolean>`${leagueMembers.userId} is not null`,
    })
    .from(user)
    .leftJoin(
      leagueMembers,
      and(eq(leagueMembers.userId, user.id), eq(leagueMembers.leagueId, input.leagueId)),
    )
    .where(inArray(user.id, [...input.userIds]))
}

/** True when the league logged a failed reset code after the given time, or ever when it is null. */
export async function hasFailedCodesSince(
  db: DbExecutor,
  input: { leagueId: string; since: Date | null },
): Promise<boolean> {
  const rows = await db
    .select({ id: auditLog.id })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.leagueId, input.leagueId),
        eq(auditLog.action, 'reset_code.failed'),
        input.since === null ? undefined : gt(auditLog.createdAt, input.since),
      ),
    )
    .limit(1)
  return rows.length > 0
}
