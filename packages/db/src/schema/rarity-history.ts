import { doublePrecision, index, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core'
import { cardTier, cards, tierSource } from './cards'
import { leagues } from './leagues'

export const cardRarityHistory = pgTable(
  'card_rarity_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leagueId: uuid('league_id')
      .notNull()
      .references(() => leagues.id, { onDelete: 'cascade' }),
    cardId: uuid('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    fromTier: cardTier('from_tier'),
    toTier: cardTier('to_tier').notNull(),
    source: tierSource('source').notNull(),
    score: doublePrecision('score'),
    percentile: doublePrecision('percentile'),
    computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('card_rarity_history_card_computed_idx').on(t.cardId, t.computedAt.desc())],
)
