import { index, pgEnum, pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { REACTION_TYPES } from '@storix/shared'
import { user } from './auth'
import { cards } from './cards'

export const reactionType = pgEnum('reaction_type', REACTION_TYPES)

export const reactions = pgTable(
  'reactions',
  {
    cardId: uuid('card_id')
      .notNull()
      .references(() => cards.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: reactionType('type').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.cardId, t.userId, t.type] }),
    index('reactions_user_id_idx').on(t.userId),
  ],
)
