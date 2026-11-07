import { randomUUID } from 'node:crypto'
import type { IncomingHttpHeaders } from 'node:http'
import { isAPIError } from 'better-auth/api'
import { fromNodeHeaders } from 'better-auth/node'
import { AppError } from '../lib/errors'
import type { Auth } from './auth'

export interface AuthSession {
  userId: string
  username: string
  displayUsername: string
}

export interface AuthGateway {
  handle(request: Request): Promise<Response>
  getSession(headers: Headers): Promise<AuthSession | null>
  getSessionFromNodeHeaders(headers: IncomingHttpHeaders): Promise<AuthSession | null>
  createCredentialUser(input: { username: string; password: string }): Promise<{ userId: string }>
  deleteUser(userId: string): Promise<void>
  setPassword(userId: string, password: string): Promise<void>
  revokeAllSessions(userId: string): Promise<void>
}

const SYNTHETIC_EMAIL_DOMAIN = 'users.storix.invalid'

function isUsernameTaken(error: unknown): boolean {
  return isAPIError(error) && error.body?.code === 'USERNAME_IS_ALREADY_TAKEN'
}

/** Wraps the Better Auth instance behind the narrow interface used by the app. */
export function createAuthGateway(auth: Auth): AuthGateway {
  async function getSession(headers: Headers): Promise<AuthSession | null> {
    const result = await auth.api.getSession({ headers })
    if (result === null) return null
    const username = result.user.username ?? ''
    return {
      userId: result.user.id,
      username,
      displayUsername: result.user.displayUsername ?? username,
    }
  }

  return {
    handle: (request) => auth.handler(request),
    getSession,
    getSessionFromNodeHeaders: (headers) => getSession(fromNodeHeaders(headers)),
    async createCredentialUser({ username, password }) {
      try {
        const result = await auth.api.signUpEmail({
          body: {
            email: `${randomUUID()}@${SYNTHETIC_EMAIL_DOMAIN}`,
            name: username,
            username,
            password,
          },
        })
        return { userId: result.user.id }
      } catch (error) {
        if (isUsernameTaken(error)) {
          throw new AppError('USERNAME_TAKEN', 409, 'Username already taken')
        }
        throw error
      }
    },
    async deleteUser(userId) {
      const ctx = await auth.$context
      await ctx.internalAdapter.deleteUser(userId)
    },
    async setPassword(userId, password) {
      const ctx = await auth.$context
      await ctx.internalAdapter.updatePassword(userId, await ctx.password.hash(password))
    },
    async revokeAllSessions(userId) {
      const ctx = await auth.$context
      await ctx.internalAdapter.deleteUserSessions(userId)
    },
  }
}
