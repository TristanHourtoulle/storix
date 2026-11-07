import { foreignKey, index, pgEnum, pgTable, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import { boosterOpenings, copyVariant } from './boosters'
import { cardTier, cards } from './cards'
import { leagueMembers, leagues } from './leagues'

export const copySource = pgEnum('copy_source', ['booster', 'craft'])

export const cardCopies = pgTable(
  'card_copies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leagueId: uuid('league_id')
      .notNull()
      .references(() => leagues.id, { onDelete: 'cascade' }),
    cardId: uuid('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    ownerId: text('owner_id').notNull(),
    variant: copyVariant('variant').notNull(),
    tierAtMint: cardTier('tier_at_mint').notNull(),
    source: copySource('source').notNull(),
    openingId: uuid('opening_id').references(() => boosterOpenings.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('card_copies_card_owner_variant_unique').on(t.cardId, t.ownerId, t.variant),
    index('card_copies_league_owner_idx').on(t.leagueId, t.ownerId),
    index('card_copies_opening_id_idx').on(t.openingId),
    foreignKey({
      name: 'card_copies_member_fk',
      columns: [t.leagueId, t.ownerId],
      foreignColumns: [leagueMembers.leagueId, leagueMembers.userId],
    }).onDelete('cascade'),
  ],
)
