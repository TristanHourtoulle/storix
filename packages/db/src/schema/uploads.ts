import { sql } from 'drizzle-orm'
import {
  type AnyPgColumn,
  boolean,
  check,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'
import {
  type CropRect,
  UPLOAD_KINDS,
  UPLOAD_REJECTION_REASONS,
  UPLOAD_STATUSES,
} from '@storix/shared'
import { user } from './auth'
import { cards } from './cards'
import { leagues } from './leagues'

export const uploadStatus = pgEnum('upload_status', UPLOAD_STATUSES)
export const uploadRejectionReason = pgEnum('upload_rejection_reason', UPLOAD_REJECTION_REASONS)
export const uploadKind = pgEnum('upload_kind', UPLOAD_KINDS)

export const uploads = pgTable(
  'uploads',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    kind: uploadKind('kind').notNull().default('card'),
    leagueId: uuid('league_id').references(() => leagues.id, { onDelete: 'cascade' }),
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
    stageOnly: boolean('stage_only').notNull().default(false),
    crop: jsonb('crop').$type<CropRect>(),
    publishRequestedAt: timestamp('publish_requested_at', { withTimezone: true }),
  },
  (t) => [
    index('uploads_league_user_created_idx').on(t.leagueId, t.userId, t.createdAt.desc()),
    index('uploads_status_created_idx').on(t.status, t.createdAt),
    check('uploads_kind_league_check', sql`(${t.kind} = 'avatar') = (${t.leagueId} is null)`),
    check(
      'uploads_portrait_flow_check',
      sql`${t.kind} = 'card' or (not ${t.stageOnly} and ${t.crop} is null and ${t.publishRequestedAt} is null)`,
    ),
    check(
      'uploads_portrait_status_check',
      sql`${t.kind} = 'card' or ${t.status}::text not in ('staged', 'publishing', 'discarded')`,
    ),
  ],
)
