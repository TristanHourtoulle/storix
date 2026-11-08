import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { playSound } from '@/features/sound/sound'
import { ApiError } from './http'

declare module '@tanstack/react-query' {
  interface Register {
    mutationMeta: { sound?: 'none' }
  }
}

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
    mutationCache: new MutationCache({
      onError: (error, _variables, _context, mutation) => {
        handleError(error)
        const isUnauthenticated = error instanceof ApiError && error.status === 401
        if (!isUnauthenticated && mutation.meta?.sound !== 'none') playSound({ name: 'error' })
      },
      onSuccess: (_data, _variables, _context, mutation) => {
        if (mutation.meta?.sound !== 'none') playSound({ name: 'confirm' })
      },
    }),
    defaultOptions: {
      queries: {
        networkMode: 'offlineFirst',
        retry: (failureCount, error) => !isClientError(error) && failureCount < 2,
      },
    },
  })
}
