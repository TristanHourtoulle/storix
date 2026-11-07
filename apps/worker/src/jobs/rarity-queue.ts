import type { PgBoss } from 'pg-boss'
import { RARITY_RECOMPUTE_JOB, type RarityRecomputePayload } from '@storix/shared'

export interface RarityQueue {
  enqueueRecompute(payload: RarityRecomputePayload): Promise<void>
}

/** Wraps pg-boss for the rarity.recompute queue, coalescing sends per league. */
export function createRarityQueue(boss: PgBoss): RarityQueue {
  return {
    async enqueueRecompute(payload) {
      await boss.send(RARITY_RECOMPUTE_JOB, payload, {
        singletonKey: payload.leagueId,
        retryLimit: 3,
        retryDelay: 30,
        retryBackoff: true,
      })
    },
  }
}
