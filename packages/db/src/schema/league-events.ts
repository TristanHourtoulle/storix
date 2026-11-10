import { sql } from 'drizzle-orm'
import { index, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { LeagueEventPayload, LeagueEventType } from '@storix/shared'
import { user } from './auth'
import { cardTier, cards } from './cards'
import { leagues } from './leagues'

export const leagueEvents = pgTable(
  'league_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leagueId: uuid('league_id')
      .notNull()
      .references(() => leagues.id, { onDelete: 'cascade' }),
    actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
    type: text('type').$type<LeagueEventType>().notNull(),
    cardId: uuid('card_id').references(() => cards.id, { onDelete: 'cascade' }),
    tier: cardTier('tier'),
    payload: jsonb('payload')
      .$type<LeagueEventPayload>()
      .notNull()
      .default(sql`'{}'::jsonb`),
    dedupeKey: text('dedupe_key').unique('league_events_dedupe_key_unique'),
    visibleAt: timestamp('visible_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('league_events_league_visible_idx').on(t.leagueId, t.visibleAt.desc(), t.id.desc()),
  ],
)
