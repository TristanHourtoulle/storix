import { sql } from 'drizzle-orm'
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { user } from './auth'
import { leagues } from './leagues'

export const AUDIT_ACTIONS = [
  'league.created',
  'invitation.created',
  'invitation.revoked',
  'member.joined',
  'member.role_changed',
  'member.removed',
  'reset_code.issued',
  'reset_code.redeemed',
  'reset_code.failed',
  'card.created',
  'copy.recycled',
  'copy.crafted',
  'copy.foil_upgraded',
  'league.settings_updated',
  'league.ownership_transferred',
  'league.deleted',
  'member.left',
  'card.hidden',
  'card.unhidden',
  'card.deleted',
  'card.withdrawn',
  'card.tier_pinned',
  'card.bounds_set',
  'card.capture_date_validated',
  'card.removed',
  'account.deleted',
  'league.renamed',
  'account.display_name_changed',
] as const

export type AuditAction = (typeof AUDIT_ACTIONS)[number]

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leagueId: uuid('league_id').references(() => leagues.id, { onDelete: 'set null' }),
    actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
    targetUserId: text('target_user_id').references(() => user.id, { onDelete: 'set null' }),
    action: text('action').$type<AuditAction>().notNull(),
    metadata: jsonb('metadata')
      .$type<Record<string, unknown>>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('audit_log_league_created_idx').on(t.leagueId, t.createdAt.desc())],
)
