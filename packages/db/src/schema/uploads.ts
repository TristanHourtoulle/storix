import { sql } from 'drizzle-orm'
import {
  type AnyPgColumn,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import { UPLOAD_REJECTION_REASONS, UPLOAD_STATUSES } from '@storix/shared'
import { user } from './auth'
import { cards } from './cards'
import { leagues } from './leagues'

export const uploadStatus = pgEnum('upload_status', UPLOAD_STATUSES)
export const uploadRejectionReason = pgEnum('upload_rejection_reason', UPLOAD_REJECTION_REASONS)

export const uploads = pgTable(
  'uploads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leagueId: uuid('league_id')
      .notNull()
      .references(() => leagues.id, { onDelete: 'cascade' }),
    userId: text('user_id').references(() => user.id, { onDelete: 'set null' }),
    objectKey: text('object_key').notNull().unique(),
    status: uploadStatus('status').notNull().default('pending'),
    title: text('title'),
    taggedUserIds: jsonb('tagged_user_ids')
      .$type<string[]>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    clientCapturedAt: timestamp('client_captured_at', { withTimezone: true }),
    rejectionReason: uploadRejectionReason('rejection_reason'),
    cardId: uuid('card_id').references((): AnyPgColumn => cards.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    processedAt: timestamp('processed_at', { withTimezone: true }),
  },
  (t) => [
    index('uploads_league_user_created_idx').on(t.leagueId, t.userId, t.createdAt.desc()),
    index('uploads_status_created_idx').on(t.status, t.createdAt),
  ],
)
