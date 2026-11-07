import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import type { MediaVariant } from '@storix/shared'
import { leagues } from './leagues'
import { uploads } from './uploads'

export const captureDateSource = pgEnum('capture_date_source', ['exif', 'client'])

export const media = pgTable(
  'media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leagueId: uuid('league_id')
      .notNull()
      .references(() => leagues.id, { onDelete: 'cascade' }),
    uploadId: uuid('upload_id')
      .notNull()
      .unique()
      .references(() => uploads.id, { onDelete: 'restrict' }),
    sourceSha256: text('source_sha256').notNull(),
    phash: text('phash').notNull(),
    thumbhash: text('thumbhash').notNull(),
    dominantColor: text('dominant_color').notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    capturedAt: timestamp('captured_at', { withTimezone: true }),
    captureDateSource: captureDateSource('capture_date_source'),
    isCaptureDateValidated: boolean('is_capture_date_validated').notNull().default(false),
    variants: jsonb('variants').$type<MediaVariant[]>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('media_league_source_sha256_unique').on(t.leagueId, t.sourceSha256),
    index('media_league_id_idx').on(t.leagueId),
  ],
)
