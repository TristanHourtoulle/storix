import { storageEnvSchema } from '@storix/storage'
import { z } from 'zod'

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3020),
  DATABASE_URL: z.url(),
  APP_ORIGIN: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  PASSKEY_RP_ID: z.string().min(1),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  WEB_DIST_DIR: z.string().optional(),
  VAPID_PUBLIC_KEY: z
    .string()
    .regex(/^[A-Za-z0-9_-]{80,100}$/)
    .optional(),
})

const envSchema = baseEnvSchema
  .extend(storageEnvSchema.shape)
  .extend({ MEDIA_URL_SECRET: z.string().min(32) })
  .refine(
    (env) =>
      !URL.canParse(env.APP_ORIGIN) || new URL(env.APP_ORIGIN).hostname === env.PASSKEY_RP_ID,
    { path: ['PASSKEY_RP_ID'], message: 'PASSKEY_RP_ID must equal the hostname of APP_ORIGIN' },
  )
  .refine((env) => env.MEDIA_URL_SECRET !== env.BETTER_AUTH_SECRET, {
    path: ['MEDIA_URL_SECRET'],
    message: 'MEDIA_URL_SECRET must differ from BETTER_AUTH_SECRET',
  })

export type Env = z.infer<typeof envSchema>

/** Parses and validates environment variables, throwing a readable error listing invalid keys. */
export function loadEnv(source: NodeJS.ProcessEnv): Env {
  const result = envSchema.safeParse(source)
  if (!result.success) {
    const problems = [
      ...new Set(result.error.issues.map((issue) => `${issue.path.join('.')} (${issue.message})`)),
    ]
    throw new Error(`Invalid environment variables: ${problems.join(', ')}`)
  }
  return result.data
}
