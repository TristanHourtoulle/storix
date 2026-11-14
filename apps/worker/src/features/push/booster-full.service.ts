import type { Database } from '@storix/db'
import {
  boosterFullNotificationBody,
  pushPayloadSchema,
  computeBoosterFullAt,
  isBoosterFullNotificationDue,
  resolveLeagueSettings,
} from '@storix/shared'
import type { WorkerLogger } from '../../lib/logger'
import type { PushSender, PushSendResult, PushTarget } from '../../lib/push-sender.types'
import { runInTransaction } from '../../lib/transaction'
import * as repository from './booster-full.repository'

const CANDIDATE_PAGE_SIZE = 2000
const NOTIFICATION_TITLE = 'Storix'

export interface BoosterFullService {
  scan(signal?: AbortSignal): Promise<void>
}

interface Deps {
  db: Database
  sender: PushSender
  clock: () => Date
  logger: WorkerLogger
}

type SendCounts = Readonly<Record<PushSendResult, number>>

const NO_SENDS: SendCounts = { sent: 0, gone: 0, refused: 0, failed: 0 }

interface ClaimedFill {
  leagueName: string
  maxStock: number
}

function addCounts(a: SendCounts, b: SendCounts): SendCounts {
  return {
    sent: a.sent + b.sent,
    gone: a.gone + b.gone,
    refused: a.refused + b.refused,
    failed: a.failed + b.failed,
  }
}

/** Reduces an error to its name and driver code, since query errors embed SQL parameters such as push endpoints. */
function errorSummary(error: unknown): { name?: string; code?: string } {
  const cause = error instanceof Error && error.cause !== undefined ? error.cause : error
  const code =
    typeof cause === 'object' && cause !== null && 'code' in cause && typeof cause.code === 'string'
      ? cause.code
      : undefined
  return { name: error instanceof Error ? error.name : undefined, code }
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

  async function sendToTarget(
    leagueId: string,
    target: PushTarget,
    payload: Parameters<PushSender['send']>[1],
  ): Promise<PushSendResult> {
    const result = await sender.send(target, payload)
    if (result !== 'gone' && result !== 'refused') return result
    try {
      await repository.deletePushSubscription(db, target.endpoint)
    } catch (error) {
      logger.error(
        { leagueId, ...errorSummary(error) },
        'Could not delete a dead push subscription',
      )
    }
    return result
  }

  async function notify(
    candidate: repository.BoosterFullCandidate,
    fill: ClaimedFill,
  ): Promise<SendCounts> {
    const payload = pushPayloadSchema.parse({
      v: 1,
      title: NOTIFICATION_TITLE,
      body: boosterFullNotificationBody(fill.leagueName, fill.maxStock),
      url: `/l/${candidate.leagueId}`,
      tag: `booster-full:${candidate.leagueId}`,
    })
    const targets = await repository.listUserPushTargets(db, candidate.userId)
    let counts = NO_SENDS
    for (const target of targets) {
      const result = await sendToTarget(candidate.leagueId, target, payload)
      counts = { ...counts, [result]: counts[result] + 1 }
    }
    return counts
  }

  return {
    async scan(signal) {
      const now = clock()
      let claimed = 0
      let totals = NO_SENDS
      let after: repository.CandidatePage['after'] = null
      let isStopped = false
      while (!isStopped) {
        const page = await repository.listBoosterFullCandidates(db, {
          limit: CANDIDATE_PAGE_SIZE,
          after,
        })
        for (const candidate of page) {
          if (signal?.aborted) {
            isStopped = true
            break
          }
          try {
            if (dueMaxStock(candidate.settings, candidate, now) === null) continue
            const fill = await claim(candidate, now)
            if (fill === null) continue
            claimed += 1
            totals = addCounts(totals, await notify(candidate, fill))
          } catch (error) {
            logger.error(
              { leagueId: candidate.leagueId, ...errorSummary(error) },
              'Booster-full notification failed',
            )
          }
        }
        const last = page.at(-1)
        if (last === undefined || page.length < CANDIDATE_PAGE_SIZE) break
        after = { leagueId: last.leagueId, userId: last.userId }
      }
      if (isStopped) logger.warn({ claimed, ...totals }, 'Booster-full scan stopped: job expired')
      else if (claimed > 0) logger.info({ claimed, ...totals }, 'Booster-full scan done')
    },
  }
}
