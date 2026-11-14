import { sql } from 'drizzle-orm'
import { check, integer, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { user } from './auth'
import { leagues } from './leagues'

export const cosmeticPurchases = pgTable(
  'cosmetic_purchases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    itemId: text('item_id').notNull(),
    leagueId: uuid('league_id').references(() => leagues.id, { onDelete: 'set null' }),
    price: integer('price').notNull(),
    purchasedAt: timestamp('purchased_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('cosmetic_purchases_user_item_unique').on(t.userId, t.itemId),
    check('cosmetic_purchases_price_non_negative', sql`${t.price} >= 0`),
  ],
)

export const userCosmetics = pgTable('user_cosmetics', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  booster: text('booster'),
  cardBack: text('card_back'),
  raritySet: text('rarity_set'),
  avatarFrame: text('avatar_frame'),
  revealAura: text('reveal_aura'),
  banner: text('banner'),
  nameStyle: text('name_style'),
  momentStamp: text('moment_stamp'),
  openingTear: text('opening_tear'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
