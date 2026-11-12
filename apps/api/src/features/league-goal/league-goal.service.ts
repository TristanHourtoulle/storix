import type { Database } from '@storix/db'
import {
  GOAL_CONTRIBUTOR_AVATARS,
  missionWeekKey,
  periodBounds,
  type GoalContributor,
  type GoalContributors,
  type LeagueGoal,
} from '@storix/shared'
import type { MediaSigner } from '../../lib/media-signer'
import { runInTransaction } from '../../lib/transaction'
import type { Membership } from '../leagues/leagues.service'
import { ORIGINAL_LOOK, findMemberLooks } from '../cosmetics/cosmetics.repository'
import { toPortraitView } from '../portraits/portrait-view'
import {
  advanceGoal,
  ensureWeekGoal,
  findGoalBannerSeenWeek,
  listGoalContributions,
  listGoalPeople,
  markGoalBannerSeen,
  type GoalContribution,
} from './league-goal.repository'

export interface LeagueGoalService {
  getGoal(m: Membership): Promise<LeagueGoal>
  listContributors(m: Membership): Promise<GoalContributors>
  markBannerSeen(m: Membership): Promise<void>
}

export interface LeagueGoalServiceDeps {
  db: Database
  signer: MediaSigner
  clock: () => Date
}

/** Builds the service for the weekly league goal: lazy creation, live progress, rewards and banner. */
export function createLeagueGoalService({
  db,
  signer,
  clock,
}: LeagueGoalServiceDeps): LeagueGoalService {
  async function toContributors(
    leagueId: string,
    rows: readonly GoalContribution[],
  ): Promise<GoalContributor[]> {
    const userIds = rows.map((row) => row.userId)
    const [peopleRows, looks] = await Promise.all([
      listGoalPeople(db, leagueId, userIds),
      findMemberLooks(db, userIds),
    ])
    const people = new Map(peopleRows.map((p) => [p.userId, p]))
    return rows.flatMap((row) => {
      const person = people.get(row.userId)
      if (person === undefined) return []
      const look = looks.get(row.userId) ?? ORIGINAL_LOOK
      const avatar =
        person.avatarUploadId === null || person.avatarColor === null
          ? null
          : toPortraitView(
              {
                kind: 'avatar',
                ownerId: person.userId,
                uploadId: person.avatarUploadId,
                dominantColor: person.avatarColor,
              },
              signer,
            )
      return [
        {
          userId: row.userId,
          displayUsername: person.displayUsername,
          avatar,
          avatarFrame: look.avatarFrame,
          nameStyle: look.nameStyle,
          count: row.count,
        },
      ]
    })
  }

  async function loadWeek(m: Membership) {
    const now = clock()
    const weekKey = missionWeekKey(now)
    return runInTransaction(db, async (tx) => {
      const created = await ensureWeekGoal(tx, { leagueId: m.leagueId, weekKey, now })
      const contributions = await listGoalContributions(tx, created)
      const progress = contributions.reduce((sum, row) => sum + row.count, 0)
      const goal = await advanceGoal(tx, { goal: created, progress, now })
      return { goal, contributions, progress }
    })
  }

  return {
    async getGoal(m) {
      const { goal, contributions, progress } = await loadWeek(m)
      const own = contributions.find((row) => row.userId === m.userId)?.count ?? 0
      const others = contributions.filter((row) => row.userId !== m.userId)
      const seenWeek = await findGoalBannerSeenWeek(db, m.leagueId, m.userId)
      return {
        weekKey: goal.weekKey,
        type: goal.type,
        target: goal.target,
        bonusTarget: goal.bonusTarget,
        progress,
        status: goal.status,
        endsAt: periodBounds('week', goal.weekKey).end.toISOString(),
        own,
        contributorsCount: others.length,
        contributors: await toContributors(m.leagueId, others.slice(0, GOAL_CONTRIBUTOR_AVATARS)),
        showBanner:
          (goal.status === 'reached' || goal.status === 'bonus') && seenWeek !== goal.weekKey,
      }
    },

    async listContributors(m) {
      const { goal, contributions } = await loadWeek(m)
      const contributors = await toContributors(m.leagueId, contributions)
      return {
        type: goal.type,
        contributors: contributors.toSorted((a, b) =>
          a.displayUsername.localeCompare(b.displayUsername, 'fr'),
        ),
      }
    },

    async markBannerSeen(m) {
      await markGoalBannerSeen(db, {
        leagueId: m.leagueId,
        userId: m.userId,
        weekKey: missionWeekKey(clock()),
      })
    },
  }
}
