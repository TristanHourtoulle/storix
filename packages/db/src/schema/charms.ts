import { sql } from 'drizzle-orm'
import {
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { leagueMembers, leagues } from './leagues'

export const charmPurchases = pgTable(
  'charm_purchases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leagueId: uuid('league_id')
      .notNull()
      .references(() => leagues.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    charm: text('charm').notNull(),
    price: integer('price').notNull(),
    purchasedAt: timestamp('purchased_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('charm_purchases_price_non_negative', sql`${t.price} >= 0`),
    index('charm_purchases_member_idx').on(t.leagueId, t.userId, t.purchasedAt.desc()),
    foreignKey({
      name: 'charm_purchases_member_fk',
      columns: [t.leagueId, t.userId],
      foreignColumns: [leagueMembers.leagueId, leagueMembers.userId],
    }).onDelete('cascade'),
  ],
)
