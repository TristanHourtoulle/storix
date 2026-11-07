import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { ApiError } from './http'

function isClientError(error: unknown): boolean {
  return error instanceof ApiError && error.status >= 400 && error.status < 500
}

/** Builds the app QueryClient; a 401 from any query or mutation triggers onUnauthenticated. */
export function createQueryClient(onUnauthenticated: () => void): QueryClient {
  const handleError = (error: unknown): void => {
    if (error instanceof ApiError && error.status === 401) onUnauthenticated()
  }
  return new QueryClient({
    queryCache: new QueryCache({ onError: handleError }),
    mutationCache: new MutationCache({ onError: handleError }),
    defaultOptions: {
      queries: {
        retry: (failureCount, error) => !isClientError(error) && failureCount < 2,
      },
    },
  })
}
