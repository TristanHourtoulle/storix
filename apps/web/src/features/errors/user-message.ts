import { ApiError } from '@/lib/http'
import { errorMessage } from './error-messages'

/** Error whose message is already a French, user-facing sentence. */
export class UserFacingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UserFacingError'
  }
}

/** Converts any thrown value to a French message safe to display. */
export function userMessage(error: unknown): string {
  if (error instanceof ApiError) return errorMessage(error.code, error.details)
  if (error instanceof UserFacingError) return error.message
  return errorMessage('INTERNAL_ERROR')
}
