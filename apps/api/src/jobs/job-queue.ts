import { MEDIA_PROCESS_JOB, type MediaProcessPayload } from '@storix/shared'
import type { FastifyBaseLogger } from 'fastify'
import { PgBoss } from 'pg-boss'

const MEDIA_PROCESS_SEND_OPTIONS = { retryLimit: 3, retryDelay: 15, retryBackoff: true } as const

export interface JobQueue {
  enqueueMediaProcess(payload: MediaProcessPayload): Promise<void>
  stop(): Promise<void>
}

/** Starts a send-only pg-boss client and ensures the media processing queue exists. */
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
  } catch (error) {
    await boss.stop({ graceful: false })
    throw error
  }

  return {
    async enqueueMediaProcess(payload) {
      await boss.send(MEDIA_PROCESS_JOB, payload, MEDIA_PROCESS_SEND_OPTIONS)
    },
    stop: () => boss.stop({ graceful: true }),
  }
}
