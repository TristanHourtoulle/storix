import {
  MEDIA_PROCESS_JOB,
  MEDIA_PUBLISH_JOB,
  MEDIA_PUBLISH_QUEUE_OPTIONS,
  RARITY_RECOMPUTE_JOB,
  RARITY_RECOMPUTE_QUEUE_OPTIONS,
  RARITY_RECOMPUTE_SEND_OPTIONS,
  STORAGE_DELETE_JOB,
  STORAGE_DELETE_SEND_OPTIONS,
  mediaPublishPayloadSchema,
  mediaPublishSendOptions,
  rarityRecomputePayloadSchema,
  storageDeletePayloadSchema,
  type MediaProcessPayload,
  type MediaPublishPayload,
  type RarityRecomputePayload,
} from '@storix/shared'
import type { FastifyBaseLogger } from 'fastify'
import { PgBoss } from 'pg-boss'

const MEDIA_PROCESS_SEND_OPTIONS = { retryLimit: 3, retryDelay: 15, retryBackoff: true } as const
const STORAGE_DELETE_CHUNK_SIZE = 1000

export interface JobQueue {
  enqueueMediaProcess(payload: MediaProcessPayload): Promise<void>
  enqueueMediaPublish(payload: MediaPublishPayload): Promise<void>
  enqueueRarityRecompute(payload: RarityRecomputePayload): Promise<void>
  enqueueStorageDelete(keys: readonly string[], options?: { delaySeconds?: number }): Promise<void>
  stop(): Promise<void>
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  )
}

/** Starts a send-only pg-boss client and ensures the queues the API sends to exist. */
export async function startJobQueue(input: {
  databaseUrl: string
  logger: FastifyBaseLogger
}): Promise<JobQueue> {
  const boss = new PgBoss({
    connectionString: input.databaseUrl,
    schema: 'pgboss',
    supervise: false,
    schedule: false,
    instanceName: 'api',
  })
  boss.on('error', (error) => input.logger.error({ err: error }, 'Job queue error'))
  await boss.start()
  try {
    await boss.createQueue(MEDIA_PROCESS_JOB)
    await boss.createQueue(MEDIA_PUBLISH_JOB, MEDIA_PUBLISH_QUEUE_OPTIONS)
    await boss.createQueue(RARITY_RECOMPUTE_JOB, RARITY_RECOMPUTE_QUEUE_OPTIONS)
    await boss.createQueue(STORAGE_DELETE_JOB, STORAGE_DELETE_SEND_OPTIONS)
  } catch (error) {
    await boss.stop({ graceful: false })
    throw error
  }

  return {
    async enqueueMediaProcess(payload) {
      await boss.send(MEDIA_PROCESS_JOB, payload, MEDIA_PROCESS_SEND_OPTIONS)
    },
    async enqueueMediaPublish(payload) {
      const data = mediaPublishPayloadSchema.parse(payload)
      await boss.send(MEDIA_PUBLISH_JOB, data, mediaPublishSendOptions(data.uploadId))
    },
    async enqueueRarityRecompute(payload) {
      const data = rarityRecomputePayloadSchema.parse(payload)
      await boss.send(RARITY_RECOMPUTE_JOB, data, {
        ...RARITY_RECOMPUTE_SEND_OPTIONS,
        singletonKey: data.leagueId,
      })
    },
    async enqueueStorageDelete(keys, options) {
      const startAfter = options?.delaySeconds
      for (const part of chunk([...new Set(keys)], STORAGE_DELETE_CHUNK_SIZE)) {
        const data = storageDeletePayloadSchema.parse({ keys: part })
        await boss.send(STORAGE_DELETE_JOB, data, {
          ...STORAGE_DELETE_SEND_OPTIONS,
          ...(startAfter === undefined ? {} : { startAfter }),
        })
      }
    },
    stop: () => boss.stop({ graceful: true }),
  }
}
