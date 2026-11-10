import { index, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { user } from './auth'
import { leagueEvents } from './league-events'

export const eventBravos = pgTable(
  'event_bravos',
  {
    eventId: uuid('event_id')
      .notNull()
      .references(() => leagueEvents.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.eventId, t.userId] }),
    index('event_bravos_user_created_idx').on(t.userId, t.createdAt),
  ],
)
