import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
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
    boostersOpened: integer('boosters_opened').notNull().default(0),
    bonusBoosters: integer('bonus_boosters').notNull().default(0),
    premiumGifts: integer('premium_gifts').notNull().default(0),
    boosterFullNotifiedAt: timestamp('booster_full_notified_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.leagueId, t.userId] }),
    check('member_wallets_dust_non_negative', sql`${t.dust} >= 0`),
    check('member_wallets_booster_stock_non_negative', sql`${t.boosterStock} >= 0`),
    check(
      'member_wallets_pity_non_negative',
      sql`${t.pitySinceEpic} >= 0 AND ${t.pitySinceLegendary} >= 0`,
    ),
    check('member_wallets_boosters_opened_non_negative', sql`${t.boostersOpened} >= 0`),
    check(
      'member_wallets_bonus_non_negative',
      sql`${t.bonusBoosters} >= 0 AND ${t.premiumGifts} >= 0`,
    ),
    foreignKey({
      name: 'member_wallets_member_fk',
      columns: [t.leagueId, t.userId],
      foreignColumns: [leagueMembers.leagueId, leagueMembers.userId],
    }).onDelete('cascade'),
  ],
)
