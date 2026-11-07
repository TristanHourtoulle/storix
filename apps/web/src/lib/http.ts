import { apiErrorSchema, type ErrorCode } from '@storix/shared'
import type { z } from 'zod'

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

interface VoidRequestOptions {
  method?: HttpMethod
  body?: unknown
  signal?: AbortSignal
}

interface RequestOptions<T> extends VoidRequestOptions {
  schema: z.ZodType<T>
}

/** Error raised for any non-2xx API response or unreadable payload. */
export class ApiError extends Error {
  readonly code: ErrorCode
  readonly status: number
  readonly details?: Record<string, unknown>

  constructor(code: ErrorCode, status: number, message: string, details?: Record<string, unknown>) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    if (details) this.details = details
  }
}

async function toApiError(response: Response): Promise<ApiError> {
  const payload: unknown = await response.json().catch(() => null)
  const parsed = apiErrorSchema.safeParse(payload)
  if (parsed.success) {
    const { code, message, details } = parsed.data.error
    return new ApiError(code, response.status, message, details)
  }
  return new ApiError('INTERNAL_ERROR', response.status, response.statusText)
}

async function send(path: string, options: VoidRequestOptions): Promise<Response> {
  const hasBody = options.body !== undefined
  const response = await fetch(path, {
    method: options.method ?? 'GET',
    credentials: 'same-origin',
    headers: hasBody ? { 'Content-Type': 'application/json' } : undefined,
    body: hasBody ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  })
  if (!response.ok) throw await toApiError(response)
  return response
}

/** Performs a JSON request and validates the response body with the given schema. */
export async function apiRequest<T>(path: string, options: RequestOptions<T>): Promise<T> {
  const response = await send(path, options)
  const payload: unknown = await response.json()
  const parsed = options.schema.safeParse(payload)
  if (!parsed.success) {
    throw new ApiError('INTERNAL_ERROR', response.status, 'Unexpected response shape')
  }
  return parsed.data
}

/** Performs a JSON request and ignores the response body. */
export async function apiRequestVoid(
  path: string,
  options: VoidRequestOptions = {},
): Promise<void> {
  await send(path, options)
}
