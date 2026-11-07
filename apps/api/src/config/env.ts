import { z } from 'zod'

const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65535).default(3020),
    DATABASE_URL: z.url(),
    APP_ORIGIN: z.url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    PASSKEY_RP_ID: z.string().min(1),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
    WEB_DIST_DIR: z.string().optional(),
  })
  .refine((env) => new URL(env.APP_ORIGIN).hostname === env.PASSKEY_RP_ID, {
    path: ['PASSKEY_RP_ID'],
    message: 'PASSKEY_RP_ID must equal the hostname of APP_ORIGIN',
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
