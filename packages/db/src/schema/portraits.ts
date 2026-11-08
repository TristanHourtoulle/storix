import { sql } from 'drizzle-orm'
import { check, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'
import { PORTRAIT_KINDS } from '@storix/shared/domain'
import { user } from './auth'
import { leagues } from './leagues'
import { uploads } from './uploads'

export const portraitKind = pgEnum('portrait_kind', PORTRAIT_KINDS)

export const portraits = pgTable(
  'portraits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: portraitKind('kind').notNull(),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    leagueId: uuid('league_id').references(() => leagues.id, { onDelete: 'cascade' }),
    uploadId: uuid('upload_id')
      .notNull()
      .unique()
      .references(() => uploads.id, { onDelete: 'no action' }),
    dominantColor: text('dominant_color').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check(
      'portraits_owner_check',
      sql`(${t.kind} = 'avatar' and ${t.userId} is not null and ${t.leagueId} is null) or (${t.kind} = 'league' and ${t.leagueId} is not null and ${t.userId} is null)`,
    ),
    uniqueIndex('portraits_user_unique')
      .on(t.userId)
      .where(sql`${t.userId} is not null`),
    uniqueIndex('portraits_league_unique')
      .on(t.leagueId)
      .where(sql`${t.leagueId} is not null`),
  ],
)
