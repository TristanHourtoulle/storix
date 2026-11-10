import type { PgBoss } from 'pg-boss'
import {
  EMBLEMS_EVALUATE_JOB,
  emblemsEvaluateSendOptions,
  type EmblemsEvaluatePayload,
} from '@storix/shared'

export interface EmblemsQueue {
  enqueueEvaluate(payload: EmblemsEvaluatePayload): Promise<void>
}

/** Wraps pg-boss for the emblems.evaluate-league queue, coalescing sends per member or per league. */
export function createEmblemsQueue(boss: PgBoss): EmblemsQueue {
  return {
    async enqueueEvaluate(payload) {
      await boss.send(EMBLEMS_EVALUATE_JOB, payload, emblemsEvaluateSendOptions(payload))
    },
  }
}
