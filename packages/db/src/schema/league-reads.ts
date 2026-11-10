import { foreignKey, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { leagueMembers } from './leagues'

export const leagueReads = pgTable(
  'league_reads',
  {
    leagueId: uuid('league_id').notNull(),
    userId: text('user_id').notNull(),
    feedSeenAt: timestamp('feed_seen_at', { withTimezone: true }),
    mythicBannerSeenAt: timestamp('mythic_banner_seen_at', { withTimezone: true }),
    journalSeenAt: timestamp('journal_seen_at', { withTimezone: true }),
  },
  (t) => [
    primaryKey({ columns: [t.leagueId, t.userId] }),
    foreignKey({
      name: 'league_reads_member_fk',
      columns: [t.leagueId, t.userId],
      foreignColumns: [leagueMembers.leagueId, leagueMembers.userId],
    }).onDelete('cascade'),
  ],
)
