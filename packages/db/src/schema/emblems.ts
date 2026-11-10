import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { leagueMembers, leagues } from './leagues'

export const memberEmblems = pgTable(
  'member_emblems',
  {
    leagueId: uuid('league_id')
      .notNull()
      .references(() => leagues.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    emblemId: text('emblem_id').notNull(),
    earnedAt: timestamp('earned_at', { withTimezone: true }).notNull(),
    seenAt: timestamp('seen_at', { withTimezone: true }),
    featuredRank: smallint('featured_rank'),
  },
  (t) => [
    primaryKey({ columns: [t.leagueId, t.userId, t.emblemId] }),
    check(
      'member_emblems_featured_rank_range',
      sql`${t.featuredRank} IS NULL OR ${t.featuredRank} BETWEEN 1 AND 3`,
    ),
    uniqueIndex('member_emblems_featured_rank_unique')
      .on(t.leagueId, t.userId, t.featuredRank)
      .where(sql`${t.featuredRank} IS NOT NULL`),
    foreignKey({
      name: 'member_emblems_member_fk',
      columns: [t.leagueId, t.userId],
      foreignColumns: [leagueMembers.leagueId, leagueMembers.userId],
    }).onDelete('cascade'),
  ],
)
