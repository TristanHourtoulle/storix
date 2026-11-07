import { sql } from 'drizzle-orm'
import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { REMOVAL_REASONS } from '@storix/shared/domain'
import { user } from './auth'
import { leagues } from './leagues'

export const removalReason = pgEnum('removal_reason', REMOVAL_REASONS)

export const cardRemovals = pgTable(
  'card_removals',
  {
    cardId: uuid('card_id').primaryKey(),
    leagueId: uuid('league_id')
      .notNull()
      .references(() => leagues.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    mediaPrefix: text('media_prefix').notNull(),
    reason: removalReason('reason').notNull(),
    actorId: text('actor_id').references(() => user.id, { onDelete: 'set null' }),
    removedAt: timestamp('removed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('card_removals_league_removed_idx').on(t.leagueId, t.removedAt)],
)

export const cardCompensations = pgTable(
  'card_compensations',
  {
    cardId: uuid('card_id').notNull(),
    leagueId: uuid('league_id')
      .notNull()
      .references(() => leagues.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    dust: integer('dust').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.cardId, t.userId] }),
    index('card_compensations_league_user_idx').on(t.leagueId, t.userId),
    check('card_compensations_dust_positive', sql`${t.dust} > 0`),
  ],
)
