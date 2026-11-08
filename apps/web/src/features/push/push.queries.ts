import { queryOptions } from '@tanstack/react-query'
import { fetchPushConfig } from './push.api'

export const pushConfigQueryOptions = queryOptions({
  queryKey: ['push', 'config'],
  queryFn: fetchPushConfig,
  staleTime: Infinity,
  retry: 1,
})
