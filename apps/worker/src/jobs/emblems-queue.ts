import type { PgBoss } from 'pg-boss'
import {
  EMBLEMS_EVALUATE_JOB,
  EMBLEMS_EVALUATE_SEND_OPTIONS,
  type EmblemsEvaluatePayload,
} from '@storix/shared'

export interface EmblemsQueue {
  enqueueEvaluate(payload: EmblemsEvaluatePayload): Promise<void>
}

/** Wraps pg-boss for the emblems.evaluate-league queue, coalescing sends per league. */
export function createEmblemsQueue(boss: PgBoss): EmblemsQueue {
  return {
    async enqueueEvaluate(payload) {
      await boss.send(EMBLEMS_EVALUATE_JOB, payload, {
        ...EMBLEMS_EVALUATE_SEND_OPTIONS,
        singletonKey: payload.leagueId,
      })
    },
  }
}
