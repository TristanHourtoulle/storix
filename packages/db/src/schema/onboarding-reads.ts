import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { user } from './auth'

export const onboardingReads = pgTable('onboarding_reads', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  seenAt: timestamp('seen_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})
