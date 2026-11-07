import { queryOptions } from '@tanstack/react-query'
import { fetchMe } from './auth.api'

export const meQueryOptions = queryOptions({
  queryKey: ['me'],
  queryFn: fetchMe,
})
