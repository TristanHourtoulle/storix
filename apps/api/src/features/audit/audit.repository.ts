import { auditLog, type AuditAction, type DbExecutor } from '@storix/db'

export interface AuditEntry {
  leagueId: string | null
  actorId: string | null
  targetUserId: string | null
  action: AuditAction
  metadata?: Record<string, unknown>
}

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
