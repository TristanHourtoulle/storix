import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  foreignKey,
  index,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import type { SeriesKind } from '@storix/shared/domain'
import { user } from './auth'
import { cards } from './cards'
import { leagueMembers, leagues } from './leagues'

export const cardSeries = pgTable(
  'card_series',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leagueId: uuid('league_id')
      .notNull()
      .references(() => leagues.id, { onDelete: 'cascade' }),
    kind: text('kind').$type<SeriesKind>().notNull(),
    title: text('title').notNull(),
    emoji: text('emoji').notNull(),
    color: text('color').notNull(),
    weekKey: text('week_key'),
    isOverride: boolean('is_override').notNull().default(false),
    startsAt: timestamp('starts_at', { withTimezone: true }).notNull(),
    endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
    graceEndsAt: timestamp('grace_ends_at', { withTimezone: true }).notNull(),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    createdById: text('created_by_id').references(() => user.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check('card_series_kind_check', sql`${t.kind} IN ('theme', 'event')`),
    check('card_series_theme_week_check', sql`(${t.kind} = 'theme') = (${t.weekKey} IS NOT NULL)`),
    check(
      'card_series_window_check',
      sql`${t.endsAt} > ${t.startsAt} AND ${t.graceEndsAt} >= ${t.endsAt}`,
    ),
    uniqueIndex('card_series_theme_week_unique')
      .on(t.leagueId, t.weekKey)
      .where(sql`${t.kind} = 'theme'`),
    index('card_series_league_starts_idx').on(t.leagueId, t.startsAt.desc()),
    index('card_series_open_grace_idx')
      .on(t.graceEndsAt)
      .where(sql`${t.closedAt} IS NULL`),
    index('card_series_closed_idx')
      .on(t.closedAt)
      .where(sql`${t.closedAt} IS NOT NULL`),
  ],
)

export const cardSeriesCards = pgTable(
  'card_series_cards',
  {
    seriesId: uuid('series_id')
      .notNull()
      .references(() => cardSeries.id, { onDelete: 'cascade' }),
    cardId: uuid('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.seriesId, t.cardId] }),
    index('card_series_cards_card_idx').on(t.cardId),
  ],
)

export const cardSeriesRewards = pgTable(
  'card_series_rewards',
  {
    seriesId: uuid('series_id')
      .notNull()
      .references(() => cardSeries.id, { onDelete: 'cascade' }),
    leagueId: uuid('league_id').notNull(),
    userId: text('user_id').notNull(),
    rewardedAt: timestamp('rewarded_at', { withTimezone: true }).notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.seriesId, t.userId] }),
    index('card_series_rewards_member_idx').on(t.leagueId, t.userId),
    foreignKey({
      name: 'card_series_rewards_member_fk',
      columns: [t.leagueId, t.userId],
      foreignColumns: [leagueMembers.leagueId, leagueMembers.userId],
    }).onDelete('cascade'),
  ],
)
