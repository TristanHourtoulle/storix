import type { Database } from '@storix/db'
import { resolveLeagueSettings } from '@storix/shared'
import { computeLeagueRarity, isTierAtLeast, tierRank } from '@storix/shared/domain'
import type { EmblemsQueue } from '../../jobs/emblems-queue'
import type { RarityQueue } from '../../jobs/rarity-queue'
import type { WorkerLogger } from '../../lib/logger'
import { runInTransaction } from '../../lib/transaction'
import * as repository from './rarity.repository'

export interface RarityRecomputeService {
  recomputeLeague(leagueId: string): Promise<{ cards: number; changed: number }>
  enqueueAllLeagues(): Promise<number>
}

interface Deps {
  db: Database
  queue: RarityQueue
  emblems: EmblemsQueue
  clock: () => Date
  logger: WorkerLogger
}

/** Creates the use case recomputing the rarity of every active card of a league. */
export function createRarityRecomputeService(deps: Deps): RarityRecomputeService {
  const { db, queue, emblems, clock, logger } = deps

  return {
    async recomputeLeague(leagueId) {
      const outcome = await runInTransaction(db, async (tx) => {
        await repository.lockLeagueEconomyShared(tx, leagueId)
        await repository.lockLeagueRarity(tx, leagueId)
        const settings = resolveLeagueSettings(await repository.findLeagueSettings(tx, leagueId))
        const inputs = await repository.listRarityInputs(tx, leagueId)
        const now = clock()
        const results = computeLeagueRarity({
          cards: inputs,
          weights: settings.rarityWeights,
          now,
        })
        await repository.applyRarityResults(tx, results, now)

        const inputByCard = new Map(inputs.map((input) => [input.cardId, input]))
        const history = results.flatMap((result): repository.RarityHistoryRow[] => {
          const input = inputByCard.get(result.cardId)
          if (input === undefined) return []
          const isFirstComputation = input.previousComputedTier === null
          if (!isFirstComputation && input.tier === result.tier) return []
          return [
            {
              leagueId,
              cardId: result.cardId,
              fromTier: isFirstComputation ? null : input.tier,
              toTier: result.tier,
              source: result.tierSource,
              score: result.score,
              percentile: result.percentile,
              computedAt: now,
            },
          ]
        })
        await repository.insertRarityHistory(tx, history)
        const milestones = results.flatMap((result): repository.NewLeagueEvent[] => {
          const input = inputByCard.get(result.cardId)
          if (input === undefined) return []
          if (!isTierAtLeast(result.tier, 'legendary')) return []
          if (tierRank(result.tier) <= tierRank(input.tier)) return []
          return [
            {
              leagueId,
              actorId: input.authorId,
              type: 'card_tier_reached',
              cardId: result.cardId,
              tier: result.tier,
              payload: { tier: result.tier, fromTier: input.tier, toTier: result.tier },
              dedupeKey: `tier:${result.cardId}:${result.tier}:${now.getTime()}`,
              visibleAt: now,
            },
          ]
        })
        await repository.insertLeagueEvents(tx, milestones)
        return { cards: results.length, changed: history.length }
      })
      logger.info({ leagueId, ...outcome }, 'Rarity recomputed')
      await emblems.enqueueEvaluate({ leagueId })
      return outcome
    },

    async enqueueAllLeagues() {
      const leagueIds = await repository.listLeagueIds(db)
      for (const leagueId of leagueIds) await queue.enqueueRecompute({ leagueId })
      logger.info({ leagues: leagueIds.length }, 'Rarity nightly run enqueued')
      return leagueIds.length
    },
  }
}
