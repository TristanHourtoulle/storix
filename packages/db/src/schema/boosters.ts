import {
  boolean,
  foreignKey,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { COPY_VARIANTS, type PityState } from '@storix/shared'
import { cardTier, cards } from './cards'
import { leagueMembers, leagues } from './leagues'

export const copyVariant = pgEnum('copy_variant', COPY_VARIANTS)
export const pullOutcome = pgEnum('pull_outcome', ['new', 'upgraded', 'duplicate'])

export const boosterOpenings = pgTable(
  'booster_openings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leagueId: uuid('league_id')
      .notNull()
      .references(() => leagues.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    requestId: uuid('request_id').notNull(),
    seed: text('seed').notNull(),
    tableVersion: integer('table_version').notNull(),
    pityBefore: jsonb('pity_before').$type<PityState>().notNull(),
    poolDigest: text('pool_digest').notNull(),
    dustGained: integer('dust_gained').notNull().default(0),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('booster_openings_request_unique').on(t.leagueId, t.userId, t.requestId),
    index('booster_openings_league_opened_idx').on(t.leagueId, t.openedAt.desc()),
    foreignKey({
      name: 'booster_openings_member_fk',
      columns: [t.leagueId, t.userId],
      foreignColumns: [leagueMembers.leagueId, leagueMembers.userId],
    }).onDelete('cascade'),
  ],
)

export const boosterPulls = pgTable(
  'booster_pulls',
  {
    openingId: uuid('opening_id')
      .notNull()
      .references(() => boosterOpenings.id, { onDelete: 'cascade' }),
    slot: integer('slot').notNull(),
    cardId: uuid('card_id').references(() => cards.id, { onDelete: 'set null' }),
    rolledTier: cardTier('rolled_tier').notNull(),
    tierAtMint: cardTier('tier_at_mint').notNull(),
    variant: copyVariant('variant').notNull(),
    outcome: pullOutcome('outcome').notNull(),
    dust: integer('dust').notNull().default(0),
    isFirstCopy: boolean('is_first_copy').notNull(),
    isDiscovery: boolean('is_discovery').notNull(),
  },
  (t) => [primaryKey({ columns: [t.openingId, t.slot] }), index('booster_pulls_card_id_idx').on(t.cardId)],
)
