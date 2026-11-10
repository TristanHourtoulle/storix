import { foreignKey, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { leagueMembers } from './leagues'

export const memberPageVisits = pgTable(
  'member_page_visits',
  {
    leagueId: uuid('league_id').notNull(),
    visitorId: text('visitor_id').notNull(),
    visitedId: text('visited_id').notNull(),
    dayKey: text('day_key').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.leagueId, t.visitorId, t.visitedId, t.dayKey] }),
    foreignKey({
      name: 'member_page_visits_visitor_fk',
      columns: [t.leagueId, t.visitorId],
      foreignColumns: [leagueMembers.leagueId, leagueMembers.userId],
    }).onDelete('cascade'),
  ],
)
