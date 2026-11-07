import { passkey } from '@better-auth/passkey'
import { schema, type Database } from '@storix/db'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { username } from 'better-auth/plugins'
import { clientIpPolicy } from '../config/client-ip'
import type { Env } from '../config/env'

/** Builds the Better Auth instance for the given database and environment. */
export function createAuth(input: { db: Database; env: Env }) {
  const { db, env } = input
  return betterAuth({
    database: drizzleAdapter(db, { provider: 'pg', schema }),
    baseURL: env.APP_ORIGIN,
    basePath: '/api/auth',
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.APP_ORIGIN],
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      autoSignIn: false,
    },
    user: {
      additionalFields: {
        homeLeagueId: { type: 'string', required: false, input: false },
      },
    },
    session: { cookieCache: { enabled: false } },
    plugins: [
      username({ minUsernameLength: 3, maxUsernameLength: 24, immutableUsername: true }),
      passkey({ rpID: env.PASSKEY_RP_ID, rpName: 'Storix', origin: env.APP_ORIGIN }),
    ],
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        '/sign-in/username': { window: 60, max: 5 },
        '/change-password': { window: 60, max: 5 },
      },
    },
    advanced: { ipAddress: { ipAddressHeaders: clientIpPolicy(env).ipAddressHeaders } },
  })
}

export type Auth = ReturnType<typeof createAuth>
