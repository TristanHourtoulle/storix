import { sql } from 'drizzle-orm'
import { check, foreignKey, integer, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { leagueMembers, leagues } from './leagues'

export const memberWallets = pgTable(
  'member_wallets',
  {
    leagueId: uuid('league_id')
      .notNull()
      .references(() => leagues.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    dust: integer('dust').notNull().default(0),
    boosterStock: integer('booster_stock').notNull(),
    boosterStockAt: timestamp('booster_stock_at', { withTimezone: true }).notNull(),
    pitySinceEpic: integer('pity_since_epic').notNull().default(0),
    pitySinceLegendary: integer('pity_since_legendary').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.leagueId, t.userId] }),
    check('member_wallets_dust_non_negative', sql`${t.dust} >= 0`),
    foreignKey({
      name: 'member_wallets_member_fk',
      columns: [t.leagueId, t.userId],
      foreignColumns: [leagueMembers.leagueId, leagueMembers.userId],
    }).onDelete('cascade'),
  ],
)
