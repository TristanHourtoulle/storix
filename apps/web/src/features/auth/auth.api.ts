import { meResponseSchema, type MeResponse } from '@storix/shared'
import { ApiError, apiRequest } from '@/lib/http'

/** Fetches the current user and leagues; resolves null when unauthenticated. */
export async function fetchMe(): Promise<MeResponse | null> {
  try {
    return await apiRequest('/api/me', { schema: meResponseSchema })
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null
    throw error
  }
}
