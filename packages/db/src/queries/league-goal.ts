import { and, eq, isNull, sql, type SQL } from 'drizzle-orm'
import {
  bonusTarget,
  GOAL_ACTIVE_WINDOW_DAYS,
  GOAL_BONUS_PREMIUM_GIFTS,
  GOAL_REWARD_BOOSTERS,
  goalTarget,
  goalTypeForWeek,
  nextGoalFactor,
  periodBounds,
  previousWeekKey,
  type GoalType,
} from '@storix/shared/domain'
import type { DbExecutor } from '../client'
import { lockLeagueEconomyShared } from '../locks/league-locks'
import { auditLog, leagueGoals, leagues, memberWallets } from '../schema/index'
import { insertLeagueEvents } from './league-events'

export type LeagueGoalRecord = typeof leagueGoals.$inferSelect

export interface GoalContribution {
  userId: string
  count: number
  lastAt: Date
}

const DAY_MS = 86_400_000

function contributionsSql(type: GoalType, leagueId: string, since: Date, until: Date): SQL {
  const between = (column: SQL): SQL => sql`${column} >= ${since} AND ${column} < ${until}`
  switch (type) {
    case 'photos':
      return sql`SELECT c.author_id AS user_id, count(*) AS n, max(c.created_at) AS last_at
        FROM cards c WHERE c.league_id = ${leagueId} AND c.status = 'active'
        AND c.author_id IS NOT NULL AND ${between(sql`c.created_at`)} GROUP BY c.author_id`
    case 'boosters':
      return sql`SELECT o.user_id, count(*) AS n, max(o.opened_at) AS last_at
        FROM booster_openings o WHERE o.league_id = ${leagueId} AND ${between(sql`o.opened_at`)}
        GROUP BY o.user_id`
    case 'reactions':
      return sql`SELECT r.user_id, count(*) AS n, max(r.created_at) AS last_at
        FROM reactions r JOIN cards c ON c.id = r.card_id
        WHERE c.league_id = ${leagueId} AND ${between(sql`r.created_at`)} GROUP BY r.user_id`
    case 'discoveries':
      return sql`SELECT o.user_id, count(*) AS n, max(o.opened_at) AS last_at
        FROM booster_pulls p JOIN booster_openings o ON o.id = p.opening_id
        WHERE o.league_id = ${leagueId} AND p.is_discovery AND ${between(sql`o.opened_at`)}
        GROUP BY o.user_id`
    case 'bravos':
      return sql`SELECT b.user_id, count(*) AS n, max(b.created_at) AS last_at
        FROM event_bravos b JOIN league_events e ON e.id = b.event_id
        WHERE e.league_id = ${leagueId} AND ${between(sql`b.created_at`)} GROUP BY b.user_id`
  }
}

/** Lists each current member's contribution to a goal type within a week, most recent contribution first. */
export async function listGoalContributions(
  db: DbExecutor,
  input: { leagueId: string; type: GoalType; weekKey: string },
): Promise<GoalContribution[]> {
  const { start, end } = periodBounds('week', input.weekKey)
  const result = await db.execute<{ user_id: string; n: unknown; last_at: unknown }>(sql`
    SELECT x.user_id, x.n, x.last_at FROM (${contributionsSql(input.type, input.leagueId, start, end)}) x
    JOIN league_members lm ON lm.league_id = ${input.leagueId} AND lm.user_id = x.user_id
    ORDER BY x.last_at DESC, x.user_id`)
  return result.rows.map((row) => ({
    userId: row.user_id,
    count: Number(row.n),
    lastAt: new Date(String(row.last_at)),
  }))
}

async function countActiveMembers(db: DbExecutor, leagueId: string, now: Date): Promise<number> {
  const since = new Date(now.getTime() - GOAL_ACTIVE_WINDOW_DAYS * DAY_MS)
  const result = await db.execute<{ n: unknown }>(sql`
    SELECT count(DISTINCT o.user_id) AS n FROM booster_openings o
    JOIN league_members lm ON lm.league_id = o.league_id AND lm.user_id = o.user_id
    WHERE o.league_id = ${leagueId} AND o.opened_at >= ${since}`)
  return Math.max(1, Number(result.rows[0]?.n ?? 0))
}

async function findGoal(
  db: DbExecutor,
  leagueId: string,
  weekKey: string,
): Promise<LeagueGoalRecord | null> {
  const [row] = await db
    .select()
    .from(leagueGoals)
    .where(and(eq(leagueGoals.leagueId, leagueId), eq(leagueGoals.weekKey, weekKey)))
    .limit(1)
  return row ?? null
}

function factorAfter(previous: LeagueGoalRecord | null): number {
  if (previous === null) return 1
  const weekStart = periodBounds('week', previous.weekKey).start.getTime()
  const reachedWithinDays =
    previous.reachedAt === null ? null : (previous.reachedAt.getTime() - weekStart) / DAY_MS
  return nextGoalFactor({ factor: previous.factor, status: previous.status, reachedWithinDays })
}

/** Returns the league goal of a week, creating it on first use from the active members and last week's result. */
export async function ensureWeekGoal(
  db: DbExecutor,
  input: { leagueId: string; weekKey: string; now: Date },
): Promise<LeagueGoalRecord> {
  const existing = await findGoal(db, input.leagueId, input.weekKey)
  if (existing !== null) return existing
  const type = goalTypeForWeek(input.weekKey)
  const factor = factorAfter(await findGoal(db, input.leagueId, previousWeekKey(input.weekKey)))
  const target = goalTarget(type, await countActiveMembers(db, input.leagueId, input.now), factor)
  await db
    .insert(leagueGoals)
    .values({
      leagueId: input.leagueId,
      weekKey: input.weekKey,
      type,
      target,
      bonusTarget: bonusTarget(target),
      factor,
    })
    .onConflictDoNothing()
  const created = await findGoal(db, input.leagueId, input.weekKey)
  if (created === null) throw new Error('League goal missing after creation')
  return created
}

async function grantToAllMembers(
  db: DbExecutor,
  goal: LeagueGoalRecord,
  reward: { boosters: number; premiumGifts: number },
  now: Date,
): Promise<number> {
  const rows = await db
    .update(memberWallets)
    .set({
      bonusBoosters: sql`${memberWallets.bonusBoosters} + ${reward.boosters}`,
      premiumGifts: sql`${memberWallets.premiumGifts} + ${reward.premiumGifts}`,
      updatedAt: now,
    })
    .where(eq(memberWallets.leagueId, goal.leagueId))
    .returning({ userId: memberWallets.userId })
  await db.insert(auditLog).values({
    leagueId: goal.leagueId,
    actorId: null,
    targetUserId: null,
    action: 'league_goal.reward_granted',
    metadata: { weekKey: goal.weekKey, type: goal.type, ...reward, members: rows.length },
  })
  return rows.length
}

/**
 * Moves an active goal to reached, then to bonus, rewarding every member exactly once per tier.
 * Runs inside the caller's transaction; repeated calls with the same progress change nothing.
 */
export async function advanceGoal(
  db: DbExecutor,
  input: { goal: LeagueGoalRecord; progress: number; now: Date },
): Promise<LeagueGoalRecord> {
  const { goal, progress, now } = input
  const payload = { goalType: goal.type, target: goal.target, progress, weekKey: goal.weekKey }
  let current = goal
  if (current.status === 'active' && progress >= current.target) {
    await lockLeagueEconomyShared(db, goal.leagueId)
    const [reached] = await db
      .update(leagueGoals)
      .set({ status: 'reached', reachedAt: now })
      .where(and(eq(leagueGoals.id, goal.id), eq(leagueGoals.status, 'active')))
      .returning()
    if (reached !== undefined) {
      await grantToAllMembers(db, reached, { boosters: GOAL_REWARD_BOOSTERS, premiumGifts: 0 }, now)
      await insertLeagueEvents(db, [
        {
          leagueId: goal.leagueId,
          actorId: null,
          type: 'league_goal_reached',
          payload,
          dedupeKey: `goal:reached:${goal.id}`,
          visibleAt: now,
        },
      ])
      current = reached
    }
  }
  if (current.status === 'reached' && progress >= current.bonusTarget) {
    await lockLeagueEconomyShared(db, goal.leagueId)
    const [bonus] = await db
      .update(leagueGoals)
      .set({ status: 'bonus', bonusReachedAt: now })
      .where(and(eq(leagueGoals.id, goal.id), eq(leagueGoals.status, 'reached')))
      .returning()
    if (bonus !== undefined) {
      await grantToAllMembers(
        db,
        bonus,
        { boosters: 0, premiumGifts: GOAL_BONUS_PREMIUM_GIFTS },
        now,
      )
      await insertLeagueEvents(db, [
        {
          leagueId: goal.leagueId,
          actorId: null,
          type: 'league_goal_bonus',
          payload: { ...payload, target: goal.bonusTarget },
          dedupeKey: `goal:bonus:${goal.id}`,
          visibleAt: now,
        },
      ])
      current = bonus
    }
  }
  return current
}

/** Closes a finished week's goal once: an active goal becomes missed and is announced in the feed. */
export async function closeGoal(
  db: DbExecutor,
  input: { goal: LeagueGoalRecord; progress: number; now: Date },
): Promise<void> {
  const { goal, progress, now } = input
  const missed = goal.status === 'active'
  const [closed] = await db
    .update(leagueGoals)
    .set({ closedAt: now, ...(missed ? { status: 'missed' as const } : {}) })
    .where(and(eq(leagueGoals.id, goal.id), isNull(leagueGoals.closedAt)))
    .returning()
  if (closed === undefined || !missed) return
  await insertLeagueEvents(db, [
    {
      leagueId: goal.leagueId,
      actorId: null,
      type: 'league_goal_missed',
      payload: { goalType: goal.type, target: goal.target, progress, weekKey: goal.weekKey },
      dedupeKey: `goal:missed:${goal.id}`,
      visibleAt: now,
    },
  ])
}

/** Lists the open goals of a week across leagues, for the worker tick and close jobs. */
export async function listOpenGoals(db: DbExecutor, weekKey: string): Promise<LeagueGoalRecord[]> {
  return db
    .select()
    .from(leagueGoals)
    .where(and(eq(leagueGoals.weekKey, weekKey), isNull(leagueGoals.closedAt)))
}

/** Sums the contributions of a goal's week. */
export async function goalProgress(db: DbExecutor, goal: LeagueGoalRecord): Promise<number> {
  const rows = await listGoalContributions(db, goal)
  return rows.reduce((sum, row) => sum + row.count, 0)
}

/** Lists the ids of every league, for creating each week's goals. */
export async function listLeagueIds(db: DbExecutor): Promise<string[]> {
  const rows = await db.select({ id: leagues.id }).from(leagues)
  return rows.map((row) => row.id)
}
