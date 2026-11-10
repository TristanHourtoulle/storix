import { sql } from 'drizzle-orm'
import { check, integer, pgTable, real, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core'
import type { GoalStatus, GoalType } from '@storix/shared'
import { leagues } from './leagues'

export const leagueGoals = pgTable(
  'league_goals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leagueId: uuid('league_id')
      .notNull()
      .references(() => leagues.id, { onDelete: 'cascade' }),
    weekKey: text('week_key').notNull(),
    type: text('type').$type<GoalType>().notNull(),
    target: integer('target').notNull(),
    bonusTarget: integer('bonus_target').notNull(),
    factor: real('factor').notNull().default(1),
    status: text('status').$type<GoalStatus>().notNull().default('active'),
    reachedAt: timestamp('reached_at', { withTimezone: true }),
    bonusReachedAt: timestamp('bonus_reached_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('league_goals_week_unique').on(t.leagueId, t.weekKey),
    check(
      'league_goals_status_check',
      sql`${t.status} IN ('active', 'reached', 'bonus', 'missed')`,
    ),
    check(
      'league_goals_type_check',
      sql`${t.type} IN ('photos', 'boosters', 'reactions', 'discoveries', 'bravos')`,
    ),
    check(
      'league_goals_targets_positive',
      sql`${t.target} >= 1 AND ${t.bonusTarget} >= ${t.target}`,
    ),
  ],
)
