import { storageEnvSchema } from '@storix/storage'
import { z } from 'zod'

const VAPID_KEYS_MESSAGE =
  'VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT must be set together'

const workerEnvSchema = z
  .object({
    ...storageEnvSchema.shape,
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    DATABASE_URL: z.url(),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    MEDIA_CONCURRENCY: z.coerce.number().int().min(1).max(16).default(2),
    VAPID_PUBLIC_KEY: z
      .string()
      .regex(/^[A-Za-z0-9_-]{80,100}$/)
      .optional(),
    VAPID_PRIVATE_KEY: z
      .string()
      .regex(/^[A-Za-z0-9_-]{40,50}$/)
      .optional(),
    VAPID_SUBJECT: z
      .string()
      .regex(/^(https:\/\/|mailto:)/)
      .optional(),
  })
  .refine(
    (env) => {
      const set = [env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY, env.VAPID_SUBJECT].filter(
        (value) => value !== undefined,
      )
      return set.length === 0 || set.length === 3
    },
    { path: ['VAPID_PRIVATE_KEY'], message: VAPID_KEYS_MESSAGE },
  )

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
