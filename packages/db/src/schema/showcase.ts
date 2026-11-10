import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  pgTable,
  primaryKey,
  smallint,
  text,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { cards } from './cards'
import { leagueMembers, leagues } from './leagues'

export const memberShowcase = pgTable(
  'member_showcase',
  {
    leagueId: uuid('league_id')
      .notNull()
      .references(() => leagues.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    slot: smallint('slot').notNull(),
    cardId: uuid('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
  },
  (t) => [
    primaryKey({ columns: [t.leagueId, t.userId, t.slot] }),
    unique('member_showcase_card_unique').on(t.leagueId, t.userId, t.cardId),
    check('member_showcase_slot_range', sql`${t.slot} BETWEEN 1 AND 6`),
    foreignKey({
      name: 'member_showcase_member_fk',
      columns: [t.leagueId, t.userId],
      foreignColumns: [leagueMembers.leagueId, leagueMembers.userId],
    }).onDelete('cascade'),
  ],
)
