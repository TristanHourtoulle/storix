import { createHash } from 'node:crypto'
import { and, asc, eq, getTableColumns, gte, isNull, lt, sql, type SQL } from 'drizzle-orm'
import {
  BOOSTER_SEED_HEX_LENGTH,
  missionDefinition,
  missionSeedInput,
  periodBounds,
  previousDayKey,
  selectDailyMissions,
  selectWeeklyMissions,
  WEEKLY_MISSION_COUNT,
  type MissionPeriod,
  type MissionSource,
} from '@storix/shared/domain'
import type { DbExecutor } from '../client'
import { lockLeagueEconomyShared } from '../locks/league-locks'
import { auditLog, leagueMembers, memberMissions, memberWallets } from '../schema/index'
import { insertLeagueEvents } from './league-events'
import { ensureMemberWallets } from './wallets'

export interface MissionMember {
  leagueId: string
  userId: string
}

export type MissionRecord = typeof memberMissions.$inferSelect

export interface MissionPeriodRef {
  period: MissionPeriod
  key: string
}

/** Returns the deterministic 128-bit hex seed of a member's missions for one period. */
export function missionSeed(m: MissionMember, ref: MissionPeriodRef): string {
  return createHash('sha256')
    .update(missionSeedInput({ ...m, ...ref }))
    .digest('hex')
    .slice(0, BOOSTER_SEED_HEX_LENGTH)
}

/** Lists a member's mission rows of one period, by slot. */
export async function listPeriodMissions(
  db: DbExecutor,
  m: MissionMember,
  ref: MissionPeriodRef,
): Promise<MissionRecord[]> {
  return db
    .select()
    .from(memberMissions)
    .where(
      and(
        eq(memberMissions.leagueId, m.leagueId),
        eq(memberMissions.userId, m.userId),
        eq(memberMissions.period, ref.period),
        eq(memberMissions.periodKey, ref.key),
      ),
    )
    .orderBy(asc(memberMissions.slot))
}

/** Creates a member's missions for a period on first read, keeping existing rows untouched, and returns them. */
export async function ensurePeriodMissions(
  db: DbExecutor,
  m: MissionMember,
  ref: MissionPeriodRef,
  now: Date,
): Promise<MissionRecord[]> {
  const existing = await listPeriodMissions(db, m, ref)
  if (existing.length > 0) return existing
  const seed = missionSeed(m, ref)
  const definitions =
    ref.period === 'day'
      ? selectDailyMissions(
          seed,
          (await listPeriodMissions(db, m, { period: 'day', key: previousDayKey(ref.key) })).map(
            (row) => row.missionId,
          ),
        )
      : selectWeeklyMissions(seed)
  await db
    .insert(memberMissions)
    .values(
      definitions.map((definition, slot) => ({
        leagueId: m.leagueId,
        userId: m.userId,
        period: ref.period,
        periodKey: ref.key,
        slot,
        missionId: definition.id,
        target: definition.target,
        rewardDust: definition.reward.dust,
        rewardBoosters: definition.reward.boosters,
        startedAt: now,
      })),
    )
    .onConflictDoNothing()
  return listPeriodMissions(db, m, ref)
}

interface Window {
  since: Date
  until: Date
}

function sourceCount(source: MissionSource, m: MissionMember, w: Window, weekKey: string): SQL {
  const between = (column: SQL): SQL => sql`${column} >= ${w.since} AND ${column} < ${w.until}`
  switch (source) {
    case 'boosters':
      return sql`(SELECT count(*) FROM booster_openings o WHERE o.league_id = ${m.leagueId}
        AND o.user_id = ${m.userId} AND ${between(sql`o.opened_at`)})`
    case 'reactions':
      return sql`(SELECT count(*) FROM reactions r JOIN cards c ON c.id = r.card_id
        WHERE c.league_id = ${m.leagueId} AND r.user_id = ${m.userId} AND ${between(sql`r.created_at`)})`
    case 'reaction_authors':
      return sql`(SELECT count(DISTINCT c.author_id) FROM reactions r JOIN cards c ON c.id = r.card_id
        WHERE c.league_id = ${m.leagueId} AND r.user_id = ${m.userId} AND ${between(sql`r.created_at`)})`
    case 'photos':
      return sql`(SELECT count(*) FROM cards c WHERE c.league_id = ${m.leagueId}
        AND c.author_id = ${m.userId} AND c.status = 'active' AND ${between(sql`c.created_at`)})`
    case 'bravos':
      return sql`(SELECT count(*) FROM event_bravos b JOIN league_events e ON e.id = b.event_id
        WHERE e.league_id = ${m.leagueId} AND b.user_id = ${m.userId} AND ${between(sql`b.created_at`)})`
    case 'discoveries':
      return sql`(SELECT count(*) FROM booster_pulls p JOIN booster_openings o ON o.id = p.opening_id
        WHERE o.league_id = ${m.leagueId} AND o.user_id = ${m.userId} AND p.is_discovery
        AND ${between(sql`o.opened_at`)})`
    case 'member_visits':
      return sql`(SELECT count(*) FROM member_page_visits v WHERE v.league_id = ${m.leagueId}
        AND v.visitor_id = ${m.userId} AND ${between(sql`v.created_at`)})`
    case 'self_tags':
      return sql`(SELECT count(*) FROM card_tags t JOIN cards c ON c.id = t.card_id
        WHERE c.league_id = ${m.leagueId} AND t.user_id = ${m.userId} AND t.tagged_by_id = ${m.userId}
        AND ${between(sql`t.created_at`)})`
    case 'showcase_edits':
      return sql`(SELECT least(count(*), 1) FROM member_showcase s WHERE s.league_id = ${m.leagueId}
        AND s.user_id = ${m.userId} AND ${between(sql`s.created_at`)})`
    case 'promotions':
      return sql`(SELECT count(*) FROM league_events e WHERE e.league_id = ${m.leagueId}
        AND e.actor_id = ${m.userId} AND e.type = 'card_promoted' AND ${between(sql`e.created_at`)})`
    case 'foils':
      return sql`(SELECT count(*) FROM league_events e WHERE e.league_id = ${m.leagueId}
        AND e.actor_id = ${m.userId} AND e.type = 'card_foiled' AND ${between(sql`e.created_at`)})`
    case 'daily_streak':
      return sql`(SELECT count(*) FROM (SELECT d.period_key FROM member_missions d
        WHERE d.league_id = ${m.leagueId} AND d.user_id = ${m.userId} AND d.period = 'day'
        AND d.period_key >= ${weekKey} AND d.period_key < ${periodEndKey(weekKey)}
        GROUP BY d.period_key HAVING count(*) FILTER (WHERE d.claimed_at IS NOT NULL) >= 3) streak)`
  }
}

function periodEndKey(weekKey: string): string {
  const [year = 0, month = 1, day = 1] = weekKey.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + 7)).toISOString().slice(0, 10)
}

/** Derives each mission's progress from the member's actions since it started, capped at its target. */
export async function deriveMissionProgress(
  db: DbExecutor,
  m: MissionMember,
  rows: readonly MissionRecord[],
): Promise<Map<string, number>> {
  const counted = rows.flatMap((row) => {
    const definition = missionDefinition(row.period, row.missionId)
    if (definition === null) return []
    const { end, start } = periodBounds(row.period, row.periodKey)
    const since = row.startedAt > start ? row.startedAt : start
    return [{ row, count: sourceCount(definition.source, m, { since, until: end }, row.periodKey) }]
  })
  if (counted.length === 0) return new Map()
  const columns = sql.join(
    counted.map(({ count }, index) => sql`${count} AS ${sql.identifier(`c${index}`)}`),
    sql`, `,
  )
  const result = await db.execute<Record<string, unknown>>(sql`SELECT ${columns}`)
  const values = result.rows[0] ?? {}
  return new Map(
    counted.map(({ row }, index) => [
      row.id,
      Math.min(row.target, Number(values[`c${index}`] ?? 0)),
    ]),
  )
}

export type ClaimOutcome =
  | { status: 'not_found' }
  | { status: 'already_claimed' }
  | { status: 'not_complete' }
  | {
      status: 'claimed'
      row: MissionRecord
      progress: number
      dust: number
      weekCompleted: boolean
    }

/**
 * Claims a completed mission once and credits its reward, inside the caller's transaction.
 * Emits the "week completed" feed event when the last weekly mission of the week is claimed.
 */
export async function claimMission(
  db: DbExecutor,
  input: MissionMember & { missionRowId: string; now: Date; isAuto: boolean },
): Promise<ClaimOutcome> {
  await lockLeagueEconomyShared(db, input.leagueId)
  const [row] = await db
    .select()
    .from(memberMissions)
    .where(
      and(
        eq(memberMissions.id, input.missionRowId),
        eq(memberMissions.leagueId, input.leagueId),
        eq(memberMissions.userId, input.userId),
      ),
    )
    .for('update')
  if (row === undefined) return { status: 'not_found' }
  if (row.claimedAt !== null) return { status: 'already_claimed' }
  const progress = (await deriveMissionProgress(db, input, [row])).get(row.id) ?? 0
  if (progress < row.target) return { status: 'not_complete' }
  const [claimed] = await db
    .update(memberMissions)
    .set({ claimedAt: input.now, autoClaimed: input.isAuto })
    .where(and(eq(memberMissions.id, row.id), isNull(memberMissions.claimedAt)))
    .returning()
  if (claimed === undefined) return { status: 'already_claimed' }
  await ensureMemberWallets(db, {
    leagueId: input.leagueId,
    userIds: [input.userId],
    now: input.now,
  })
  const [wallet] = await db
    .update(memberWallets)
    .set({
      dust: sql`${memberWallets.dust} + ${claimed.rewardDust}`,
      bonusBoosters: sql`${memberWallets.bonusBoosters} + ${claimed.rewardBoosters}`,
      updatedAt: input.now,
    })
    .where(and(eq(memberWallets.leagueId, input.leagueId), eq(memberWallets.userId, input.userId)))
    .returning({ dust: memberWallets.dust })
  if (wallet === undefined) throw new Error('Member wallet not found')
  await db.insert(auditLog).values({
    leagueId: input.leagueId,
    actorId: input.userId,
    targetUserId: null,
    action: 'mission.claimed',
    metadata: {
      missionId: claimed.missionId,
      period: claimed.period,
      label: missionDefinition(claimed.period, claimed.missionId)?.label ?? claimed.missionId,
      dust: claimed.rewardDust,
      boosters: claimed.rewardBoosters,
      autoClaimed: input.isAuto,
    },
  })
  const weekCompleted =
    claimed.period === 'week' && (await isWeekCompleted(db, input, claimed.periodKey))
  if (weekCompleted) {
    await insertLeagueEvents(db, [
      {
        leagueId: input.leagueId,
        actorId: input.userId,
        type: 'missions_week_completed',
        payload: { weekKey: claimed.periodKey },
        dedupeKey: `mwc:${input.leagueId}:${input.userId}:${claimed.periodKey}`,
        visibleAt: input.now,
      },
    ])
  }
  return { status: 'claimed', row: claimed, progress, dust: wallet.dust, weekCompleted }
}

async function isWeekCompleted(
  db: DbExecutor,
  m: MissionMember,
  weekKey: string,
): Promise<boolean> {
  const rows = await listPeriodMissions(db, m, { period: 'week', key: weekKey })
  return rows.length >= WEEKLY_MISSION_COUNT && rows.every((row) => row.claimedAt !== null)
}

/**
 * Lists the unclaimed mission rows of current members whose period ended, across all leagues, for the reset settlement.
 * Covers every period key in [fromKey, beforeKey) so a missed run is caught up by the next one.
 */
export async function listUnclaimedMissions(
  db: DbExecutor,
  input: { period: MissionPeriod; fromKey: string; beforeKey: string },
): Promise<MissionRecord[]> {
  return db
    .select(getTableColumns(memberMissions))
    .from(memberMissions)
    .innerJoin(
      leagueMembers,
      and(
        eq(leagueMembers.leagueId, memberMissions.leagueId),
        eq(leagueMembers.userId, memberMissions.userId),
      ),
    )
    .where(
      and(
        eq(memberMissions.period, input.period),
        gte(memberMissions.periodKey, input.fromKey),
        lt(memberMissions.periodKey, input.beforeKey),
        isNull(memberMissions.claimedAt),
      ),
    )
    .orderBy(
      asc(memberMissions.periodKey),
      asc(memberMissions.leagueId),
      asc(memberMissions.userId),
      asc(memberMissions.slot),
    )
}
