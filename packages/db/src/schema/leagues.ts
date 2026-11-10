import { sql } from 'drizzle-orm'
import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { LEAGUE_ROLES } from '@storix/shared/domain'
import { user } from './auth'

export const leagueRole = pgEnum('league_role', LEAGUE_ROLES)

export const leagues = pgTable('leagues', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  settings: jsonb('settings').$type<unknown>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const leagueMembers = pgTable(
  'league_members',
  {
    leagueId: uuid('league_id')
      .notNull()
      .references(() => leagues.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    role: leagueRole('role').notNull(),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    emblemsEvaluatedAt: timestamp('emblems_evaluated_at', { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.leagueId, t.userId] }),
    index('league_members_user_id_idx').on(t.userId),
    uniqueIndex('league_members_one_owner')
      .on(t.leagueId)
      .where(sql`${t.role} = 'owner'`),
  ],
)
