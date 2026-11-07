import { storageEnvSchema } from '@storix/storage'
import { z } from 'zod'

const workerEnvSchema = z.object({
  ...storageEnvSchema.shape,
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.url(),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  MEDIA_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(2),
})

export type WorkerEnv = z.infer<typeof workerEnvSchema>

/** Parses and validates the worker environment, throwing a readable error listing invalid keys. */
export function loadWorkerEnv(source: NodeJS.ProcessEnv): WorkerEnv {
  const result = workerEnvSchema.safeParse(source)
  if (!result.success) {
    const problems = [
      ...new Set(result.error.issues.map((issue) => `${issue.path.join('.')} (${issue.message})`)),
    ]
    throw new Error(`Invalid environment variables: ${problems.join(', ')}`)
  }
  return result.data
}
