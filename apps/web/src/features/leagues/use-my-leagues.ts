import { useSuspenseQuery } from '@tanstack/react-query'
import type { LeagueSummary } from '@storix/shared'
import { meQueryOptions } from '@/features/auth/session.queries'

/** Returns the leagues the signed-in user belongs to. */
export function useMyLeagues(): LeagueSummary[] {
  const { data: me } = useSuspenseQuery(meQueryOptions)
  return me?.leagues ?? []
}
