import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { CARD_TIERS } from '@storix/shared'
import { user } from './auth'
import { leagues } from './leagues'
import { media } from './media'

export const cardTier = pgEnum('card_tier', CARD_TIERS)
export const tierSource = pgEnum('tier_source', ['computed', 'bounded', 'pinned'])
export const cardStatus = pgEnum('card_status', ['active', 'hidden'])

export const cards = pgTable(
  'cards',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leagueId: uuid('league_id')
      .notNull()
      .references(() => leagues.id, { onDelete: 'cascade' }),
    mediaId: uuid('media_id')
      .notNull()
      .unique()
      .references(() => media.id, { onDelete: 'no action' }),
    authorId: text('author_id').references(() => user.id, { onDelete: 'set null' }),
    number: integer('number').notNull(),
    title: text('title').notNull(),
    tier: cardTier('tier').notNull().default('common'),
    isProvisional: boolean('is_provisional').notNull().default(true),
    computedTier: cardTier('computed_tier'),
    tierSource: tierSource('tier_source').notNull().default('computed'),
    score: doublePrecision('score'),
    percentile: doublePrecision('percentile'),
    pinnedTier: cardTier('pinned_tier'),
    minTier: cardTier('min_tier'),
    maxTier: cardTier('max_tier'),
    rarityComputedAt: timestamp('rarity_computed_at', { withTimezone: true }),
    discoveredById: text('discovered_by_id').references(() => user.id, { onDelete: 'set null' }),
    discoveredAt: timestamp('discovered_at', { withTimezone: true }),
    status: cardStatus('status').notNull().default('active'),
    momentSelfieUploadId: uuid('moment_selfie_upload_id'),
    momentTakenAt: timestamp('moment_taken_at', { withTimezone: true }),
    momentLateMinutes: integer('moment_late_minutes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'cards_moment_fields_check',
      sql`(${t.momentSelfieUploadId} is null) = (${t.momentTakenAt} is null) and (${t.momentTakenAt} is null) = (${t.momentLateMinutes} is null)`,
    ),
    index('cards_league_moment_idx')
      .on(t.leagueId, t.momentTakenAt)
      .where(sql`${t.momentTakenAt} is not null`),
    unique('cards_league_number_unique').on(t.leagueId, t.number),
    index('cards_league_status_created_idx').on(t.leagueId, t.status, t.createdAt),
    index('cards_league_author_number_idx').on(t.leagueId, t.authorId, t.number.desc()),
  ],
)

export const cardTags = pgTable(
  'card_tags',
  {
    cardId: uuid('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    taggedById: text('tagged_by_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.cardId, t.userId] }),
    index('card_tags_user_id_idx').on(t.userId),
    index('card_tags_tagged_by_created_idx').on(t.taggedById, t.createdAt),
  ],
)
