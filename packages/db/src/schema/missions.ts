import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
import type { MissionPeriod } from '@storix/shared'
import { leagueMembers, leagues } from './leagues'

export const memberMissions = pgTable(
  'member_missions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    leagueId: uuid('league_id')
      .notNull()
      .references(() => leagues.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    period: text('period').$type<MissionPeriod>().notNull(),
    periodKey: text('period_key').notNull(),
    slot: smallint('slot').notNull(),
    missionId: text('mission_id').notNull(),
    target: integer('target').notNull(),
    rewardDust: integer('reward_dust').notNull().default(0),
    rewardBoosters: integer('reward_boosters').notNull().default(0),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    autoClaimed: boolean('auto_claimed').notNull().default(false),
    rerolledAt: timestamp('rerolled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('member_missions_slot_unique').on(t.leagueId, t.userId, t.period, t.periodKey, t.slot),
    index('member_missions_period_idx').on(t.period, t.periodKey),
    check('member_missions_period_check', sql`${t.period} IN ('day', 'week')`),
    check('member_missions_target_positive', sql`${t.target} >= 1`),
    check(
      'member_missions_rewards_non_negative',
      sql`${t.rewardDust} >= 0 AND ${t.rewardBoosters} >= 0`,
    ),
    foreignKey({
      name: 'member_missions_member_fk',
      columns: [t.leagueId, t.userId],
      foreignColumns: [leagueMembers.leagueId, leagueMembers.userId],
    }).onDelete('cascade'),
  ],
)
