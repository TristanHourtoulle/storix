import type { Database } from '@storix/db'
import {
  auditActionsIn,
  auditCategory,
  DEFAULT_AUDIT_CATEGORIES,
  encodeAuditCursor,
  groupAuditEntries,
  AUDIT_PAGE_SIZE,
  type AuditAction,
  type AuditCount,
  type AuditFilterQuery,
  type AuditPage,
  type AuditPerson,
  type AuditQuery,
} from '@storix/shared'
import type { Membership } from '../leagues/leagues.service'
import { findReadAt, markReadAt } from '../league-feed/league-feed.repository'
import {
  hasFailedCodesSince,
  listAuditKeys,
  listAuditPage,
  listAuditPeople,
  type AuditFilter,
  type AuditPersonRow,
} from './audit.repository'

export interface AuditService {
  listJournal(m: Membership, query: AuditQuery): Promise<AuditPage>
  countJournal(m: Membership, query: AuditFilterQuery): Promise<AuditCount>
  markJournalSeen(m: Membership): Promise<void>
}

export interface AuditServiceDeps {
  db: Database
  clock: () => Date
}

const DEFAULT_WINDOW_MS = 30 * 86_400_000

const PUBLIC_METADATA_KEYS: Partial<Record<AuditAction, readonly string[]>> = {
  'account.display_name_changed': ['from', 'to'],
  'account.avatar_changed': [],
  'account.avatar_removed': [],
  'account.deleted': [],
}

/** Keeps only the metadata a Journal may show; account actions expose an explicit allow-list. */
function publicMetadata(
  action: AuditAction,
  metadata: Record<string, unknown>,
): Record<string, unknown> {
  const allowed = PUBLIC_METADATA_KEYS[action]
  if (allowed === undefined) return metadata
  return Object.fromEntries(Object.entries(metadata).filter(([key]) => allowed.includes(key)))
}

function toFilter(m: Membership, query: AuditFilterQuery, now: Date): AuditFilter {
  const categories = query.category ?? DEFAULT_AUDIT_CATEGORIES
  return {
    leagueId: m.leagueId,
    actions: auditActionsIn(categories),
    accountActions: categories.includes('accounts') ? auditActionsIn(['accounts']) : [],
    memberId: query.memberId,
    from:
      query.from === undefined ? new Date(now.getTime() - DEFAULT_WINDOW_MS) : new Date(query.from),
  }
}

function toPerson(
  userId: string | null,
  people: ReadonlyMap<string, AuditPersonRow>,
): AuditPerson | null {
  if (userId === null) return null
  const row = people.get(userId)
  if (row === undefined) return { userId: null, displayUsername: null, isFormer: true }
  return { userId: row.userId, displayUsername: row.displayUsername, isFormer: !row.isMember }
}

/** Builds the service reading the league admin Journal from the audit log. */
export function createAuditService({ db, clock }: AuditServiceDeps): AuditService {
  return {
    async listJournal(m, query) {
      const [rows, journalSeenAt] = await Promise.all([
        listAuditPage(db, {
          ...toFilter(m, query, clock()),
          after: query.cursor,
          limit: AUDIT_PAGE_SIZE + 1,
        }),
        findReadAt(db, { leagueId: m.leagueId, userId: m.userId, column: 'journalSeenAt' }),
      ])
      const page = rows.slice(0, AUDIT_PAGE_SIZE)
      const userIds = [
        ...new Set(
          page.flatMap((row) => [row.actorId, row.targetUserId]).filter((id) => id !== null),
        ),
      ]
      const [people, hasUnseenAlerts] = await Promise.all([
        listAuditPeople(db, { leagueId: m.leagueId, userIds }),
        hasFailedCodesSince(db, { leagueId: m.leagueId, since: journalSeenAt }),
      ])
      const byId = new Map(people.map((person) => [person.userId, person]))
      const last = page.at(-1)
      return {
        entries: groupAuditEntries(page).map((entry) => ({
          id: entry.id,
          action: entry.action,
          category: auditCategory(entry.action),
          actor: toPerson(entry.actorId, byId),
          target: toPerson(entry.targetUserId, byId),
          metadata: publicMetadata(entry.action, entry.metadata),
          createdAt: entry.createdAt.toISOString(),
          count: entry.count,
          times: entry.times.map((time) => time.toISOString()),
        })),
        nextCursor:
          rows.length > AUDIT_PAGE_SIZE && last !== undefined
            ? encodeAuditCursor({ createdAtMs: last.createdAt.getTime(), id: last.id })
            : null,
        hasUnseenAlerts,
      }
    },

    async countJournal(m, query) {
      const keys = await listAuditKeys(db, toFilter(m, query, clock()))
      return { count: groupAuditEntries(keys).length }
    },

    async markJournalSeen(m) {
      await markReadAt(db, { ...m, column: 'journalSeenAt', at: clock() })
    },
  }
}
