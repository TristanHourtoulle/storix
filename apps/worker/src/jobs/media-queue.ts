import type { PgBoss } from 'pg-boss'
import {
  MEDIA_PROCESS_JOB,
  MEDIA_PUBLISH_JOB,
  MEDIA_PUBLISH_SEND_OPTIONS,
  type MediaProcessPayload,
  type MediaPublishPayload,
} from '@storix/shared'

const LIVE_STATES = new Set(['created', 'retry', 'active'])

export interface ProcessJobHistory {
  live: number
  total: number
}

export interface MediaQueue {
  enqueueMediaProcess(payload: MediaProcessPayload): Promise<void>
  processJobHistory(uploadId: string): Promise<ProcessJobHistory>
  enqueueMediaPublish(payload: MediaPublishPayload): Promise<void>
  publishJobHistory(uploadId: string): Promise<ProcessJobHistory>
}

/** Wraps pg-boss for the media.process and media.publish queues with the same send options as the API. */
export function createMediaQueue(boss: PgBoss): MediaQueue {
  async function historyOf(name: string, uploadId: string): Promise<ProcessJobHistory> {
    const jobs = await boss.findJobs(name, { data: { uploadId } })
    return {
      live: jobs.filter((job) => LIVE_STATES.has(job.state)).length,
      total: jobs.length,
    }
  }

  return {
    async enqueueMediaProcess(payload) {
      await boss.send(MEDIA_PROCESS_JOB, payload, {
        retryLimit: 3,
        retryDelay: 15,
        retryBackoff: true,
      })
    },

    processJobHistory: (uploadId) => historyOf(MEDIA_PROCESS_JOB, uploadId),

    async enqueueMediaPublish(payload) {
      await boss.send(MEDIA_PUBLISH_JOB, payload, {
        ...MEDIA_PUBLISH_SEND_OPTIONS,
        singletonKey: payload.uploadId,
      })
    },

    publishJobHistory: (uploadId) => historyOf(MEDIA_PUBLISH_JOB, uploadId),
  }
}
