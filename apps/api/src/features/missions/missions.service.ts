import type { Database } from '@storix/db'
import {
  DAILY_REROLLS,
  isMissionComplete,
  missionDayKey,
  missionDefinition,
  missionWeekKey,
  periodBounds,
  previousDayKey,
  rerollDailyMission,
  resolveLeagueSettings,
  type MissionClaim,
  type MissionPeriod,
  type MissionReroll,
  type MissionRow,
  type MissionsState,
} from '@storix/shared'
import { AppError, notFound } from '../../lib/errors'
import { runInTransaction } from '../../lib/transaction'
import { findLeagueSettings } from '../leagues/leagues.repository'
import type { Membership } from '../leagues/leagues.service'
import { ensureWallet } from '../wallets/wallets.repository'
import {
  claimMission,
  deriveMissionProgress,
  ensurePeriodMissions,
  insertMemberPageVisit,
  isLeagueMember,
  listPeriodMissions,
  lockPeriodMissions,
  missionSeed,
  replaceMission,
  type MissionRecord,
} from './missions.repository'

export interface MissionsService {
  getMissions(m: Membership): Promise<MissionsState>
  claim(m: Membership, missionRowId: string): Promise<MissionClaim>
  reroll(m: Membership, missionRowId: string): Promise<MissionReroll>
  recordVisit(m: Membership, visitedId: string): Promise<void>
}

export interface MissionsServiceDeps {
  db: Database
  clock: () => Date
}

function toRow(row: MissionRecord, progress: number, canReroll: boolean): MissionRow {
  const definition = missionDefinition(row.period, row.missionId)
  if (definition === null) throw new Error(`Unknown mission ${row.period}:${row.missionId}`)
  const isComplete = isMissionComplete(progress, row.target)
  const isClaimed = row.claimedAt !== null
  return {
    id: row.id,
    missionId: row.missionId,
    period: row.period,
    slot: row.slot,
    source: definition.source,
    label: definition.label,
    target: row.target,
    progress,
    reward: { dust: row.rewardDust, boosters: row.rewardBoosters },
    isComplete,
    isClaimed,
    isAutoClaimed: row.autoClaimed,
    canReroll: canReroll && row.period === 'day' && !isClaimed && !isComplete,
  }
}

const rerollsLeft = (rows: readonly MissionRecord[]): number =>
  Math.max(0, DAILY_REROLLS - rows.filter((row) => row.rerolledAt !== null).length)

/** Builds the service for daily and weekly missions: lazy creation, derived progress, claims and rerolls. */
export function createMissionsService({ db, clock }: MissionsServiceDeps): MissionsService {
  async function ensureMemberWallet(m: Membership, now: Date): Promise<void> {
    const { booster } = resolveLeagueSettings(await findLeagueSettings(db, m.leagueId))
    await ensureWallet(db, { leagueId: m.leagueId, userId: m.userId, cadence: booster, now })
  }

  return {
    async getMissions(m) {
      const now = clock()
      const dayKey = missionDayKey(now)
      const weekKey = missionWeekKey(now)
      const member = { leagueId: m.leagueId, userId: m.userId }
      const { day, week } = await runInTransaction(db, async (tx) => ({
        day: await ensurePeriodMissions(tx, member, { period: 'day', key: dayKey }, now),
        week: await ensurePeriodMissions(tx, member, { period: 'week', key: weekKey }, now),
      }))
      const progress = await deriveMissionProgress(db, member, [...day, ...week])
      const left = rerollsLeft(day)
      const rowsOf = (rows: readonly MissionRecord[]): MissionRow[] =>
        rows.map((row) => toRow(row, progress.get(row.id) ?? 0, left > 0))
      const stateOf = (period: MissionPeriod, key: string, rows: readonly MissionRecord[]) => ({
        key,
        resetAt: periodBounds(period, key).end.toISOString(),
        rows: rowsOf(rows),
        claimedCount: rows.filter((row) => row.claimedAt !== null).length,
      })
      return {
        day: { ...stateOf('day', dayKey, day), rerollsLeft: left },
        week: stateOf('week', weekKey, week),
      }
    },

    async claim(m, missionRowId) {
      const now = clock()
      await ensureMemberWallet(m, now)
      const outcome = await runInTransaction(db, (tx) =>
        claimMission(tx, {
          leagueId: m.leagueId,
          userId: m.userId,
          missionRowId,
          now,
          isAuto: false,
        }),
      )
      if (outcome.status === 'not_found') throw notFound('Mission not found')
      if (outcome.status === 'already_claimed') {
        throw new AppError('MISSION_ALREADY_CLAIMED', 409, 'Mission already claimed')
      }
      if (outcome.status === 'not_complete') {
        throw new AppError('MISSION_NOT_COMPLETE', 409, 'Mission not complete yet')
      }
      return {
        mission: toRow(outcome.row, outcome.progress, false),
        reward: { dust: outcome.row.rewardDust, boosters: outcome.row.rewardBoosters },
        dust: outcome.dust,
        weekCompleted: outcome.weekCompleted,
      }
    },

    async reroll(m, missionRowId) {
      const now = clock()
      const dayKey = missionDayKey(now)
      const member = { leagueId: m.leagueId, userId: m.userId }
      const row = await runInTransaction(db, async (tx) => {
        const rows = await lockPeriodMissions(tx, { ...member, period: 'day', key: dayKey })
        const target = rows.find((candidate) => candidate.id === missionRowId)
        if (target === undefined) throw notFound('Mission not found')
        const progress = (await deriveMissionProgress(tx, member, [target])).get(target.id) ?? 0
        const isAllowed =
          rerollsLeft(rows) > 0 &&
          target.claimedAt === null &&
          !isMissionComplete(progress, target.target)
        if (!isAllowed) {
          throw new AppError('MISSION_REROLL_NOT_ALLOWED', 409, 'Mission cannot be rerolled')
        }
        const yesterday = await listPeriodMissions(tx, member, {
          period: 'day',
          key: previousDayKey(dayKey),
        })
        const replacement = rerollDailyMission({
          seedHex: missionSeed(member, { period: 'day', key: dayKey }),
          rerollIndex: DAILY_REROLLS - rerollsLeft(rows),
          slot: target.slot,
          currentIds: rows.map((candidate) => candidate.missionId),
          yesterdayIds: yesterday.map((candidate) => candidate.missionId),
        })
        if (replacement === null) {
          throw new AppError('MISSION_REROLL_NOT_ALLOWED', 409, 'No mission left to draw')
        }
        return replaceMission(tx, {
          id: target.id,
          missionId: replacement.id,
          target: replacement.target,
          rewardDust: replacement.reward.dust,
          rewardBoosters: replacement.reward.boosters,
          now,
        })
      })
      return { mission: toRow(row, 0, false) }
    },

    async recordVisit(m, visitedId) {
      if (visitedId === m.userId) return
      if (!(await isLeagueMember(db, m.leagueId, visitedId))) throw notFound('Member not found')
      const now = clock()
      await insertMemberPageVisit(db, {
        leagueId: m.leagueId,
        visitorId: m.userId,
        visitedId,
        dayKey: missionDayKey(now),
        now,
      })
    },
  }
}
