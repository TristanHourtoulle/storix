import type { PgBoss } from 'pg-boss'
import { MEDIA_PROCESS_JOB, type MediaProcessPayload } from '@storix/shared'

const LIVE_STATES = new Set(['created', 'retry', 'active'])

export interface ProcessJobHistory {
  live: number
  total: number
}

export interface MediaQueue {
  enqueueMediaProcess(payload: MediaProcessPayload): Promise<void>
  processJobHistory(uploadId: string): Promise<ProcessJobHistory>
}

/** Wraps pg-boss for the media.process queue with the same send options as the API. */
export function createMediaQueue(boss: PgBoss): MediaQueue {
  return {
    async enqueueMediaProcess(payload) {
      await boss.send(MEDIA_PROCESS_JOB, payload, {
        singletonKey: payload.uploadId,
        retryLimit: 3,
        retryDelay: 15,
        retryBackoff: true,
      })
    },

    async processJobHistory(uploadId) {
      const jobs = await boss.findJobs(MEDIA_PROCESS_JOB, { data: { uploadId } })
      return {
        live: jobs.filter((job) => LIVE_STATES.has(job.state)).length,
        total: jobs.length,
      }
    },
  }
}
