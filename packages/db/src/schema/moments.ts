import { sql } from 'drizzle-orm'
import {
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import { leagues } from './leagues'
import { uploads } from './uploads'

export const moments = pgTable(
  'moments',
  {
    leagueId: uuid('league_id')
      .notNull()
      .references(() => leagues.id, { onDelete: 'cascade' }),
    day: date('day', { mode: 'string' }).notNull(),
    firesAt: timestamp('fires_at', { withTimezone: true }).notNull(),
    notifiedAt: timestamp('notified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.leagueId, t.day] })],
)

export const momentPosts = pgTable(
  'moment_posts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leagueId: uuid('league_id')
      .notNull()
      .references(() => leagues.id, { onDelete: 'cascade' }),
    day: date('day', { mode: 'string' }).notNull(),
    userId: text('user_id').notNull(),
    backUploadId: uuid('back_upload_id')
      .unique()
      .references(() => uploads.id, { onDelete: 'set null' }),
    selfieUploadId: uuid('selfie_upload_id')
      .unique()
      .references(() => uploads.id, { onDelete: 'set null' }),
    takenAt: timestamp('taken_at', { withTimezone: true }).notNull(),
    lateMinutes: integer('late_minutes').notNull(),
    rewardDust: integer('reward_dust').notNull(),
    rewardPaidAt: timestamp('reward_paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('moment_posts_member_day_unique').on(t.leagueId, t.day, t.userId),
    index('moment_posts_league_user_idx').on(t.leagueId, t.userId, t.lateMinutes),
    check('moment_posts_late_non_negative', sql`${t.lateMinutes} >= 0`),
    check('moment_posts_reward_non_negative', sql`${t.rewardDust} >= 0`),
  ],
)
