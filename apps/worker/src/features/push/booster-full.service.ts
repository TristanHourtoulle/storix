import type { Database } from '@storix/db'
import {
  boosterFullNotificationBody,
  boosterFullPushPayloadSchema,
  computeBoosterFullAt,
  isBoosterFullNotificationDue,
  resolveLeagueSettings,
} from '@storix/shared'
import type { WorkerLogger } from '../../lib/logger'
import type { PushSender } from '../../lib/push-sender'
import { runInTransaction } from '../../lib/transaction'
import * as repository from './booster-full.repository'

const CANDIDATE_LIMIT = 2000
const NOTIFICATION_TITLE = 'Storix'

export interface BoosterFullService {
  scan(): Promise<void>
}

interface Deps {
  db: Database
  sender: PushSender
  clock: () => Date
  logger: WorkerLogger
}

interface SendCounts {
  sent: number
  gone: number
  failed: number
}

const NO_SENDS: SendCounts = { sent: 0, gone: 0, failed: 0 }

interface ClaimedFill {
  leagueName: string
  maxStock: number
}

function dueMaxStock(
  settings: unknown,
  candidate: repository.BoosterFullCandidate,
  now: Date,
): number | null {
  const cadence = resolveLeagueSettings(settings).booster
  const fullAt = computeBoosterFullAt(
    { stock: candidate.boosterStock, anchor: candidate.boosterStockAt },
    cadence,
  )
  return isBoosterFullNotificationDue({ fullAt, now, notifiedAt: null }) ? cadence.maxStock : null
}

/**
 * Creates the use case that claims each newly full booster stock once and notifies every device of its member.
 * The claim re-checks the fill under the league's live settings inside a transaction holding the league row share lock.
 */
export function createBoosterFullService(deps: Deps): BoosterFullService {
  const { db, sender, clock, logger } = deps

  function claim(
    candidate: repository.BoosterFullCandidate,
    now: Date,
  ): Promise<ClaimedFill | null> {
    return runInTransaction(db, async (tx) => {
      const league = await repository.lockLeagueForClaim(tx, candidate.leagueId)
      if (league === null) return null
      const maxStock = dueMaxStock(league.settings, candidate, now)
      if (maxStock === null) return null
      const isClaimed = await repository.claimBoosterFull(tx, {
        leagueId: candidate.leagueId,
        userId: candidate.userId,
        boosterStock: candidate.boosterStock,
        boosterStockAt: candidate.boosterStockAt,
        now,
      })
      return isClaimed ? { leagueName: league.name, maxStock } : null
    })
  }

  async function notify(
    candidate: repository.BoosterFullCandidate,
    fill: ClaimedFill,
  ): Promise<SendCounts> {
    const payload = boosterFullPushPayloadSchema.parse({
      v: 1,
      title: NOTIFICATION_TITLE,
      body: boosterFullNotificationBody(fill.leagueName, fill.maxStock),
      url: `/l/${candidate.leagueId}`,
      tag: `booster-full:${candidate.leagueId}`,
    })
    const targets = await repository.listUserPushTargets(db, candidate.userId)
    let counts = NO_SENDS
    for (const target of targets) {
      const result = await sender.send(target, payload)
      if (result === 'gone') await repository.deletePushSubscription(db, target.endpoint)
      counts = { ...counts, [result]: counts[result] + 1 }
    }
    return counts
  }

  return {
    async scan() {
      const now = clock()
      const candidates = await repository.listBoosterFullCandidates(db, CANDIDATE_LIMIT)
      let claimed = 0
      let totals = NO_SENDS
      for (const candidate of candidates) {
        try {
          if (dueMaxStock(candidate.settings, candidate, now) === null) continue
          const fill = await claim(candidate, now)
          if (fill === null) continue
          claimed += 1
          const counts = await notify(candidate, fill)
          totals = {
            sent: totals.sent + counts.sent,
            gone: totals.gone + counts.gone,
            failed: totals.failed + counts.failed,
          }
        } catch (error) {
          logger.error(
            { leagueId: candidate.leagueId, err: error },
            'Booster-full notification failed',
          )
        }
      }
      if (claimed > 0) logger.info({ claimed, ...totals }, 'Booster-full scan done')
    },
  }
}
