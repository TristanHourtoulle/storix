import { auditPageSchema, type AuditCategory, type AuditPage } from '@storix/shared'
import { apiRequest, apiRequestVoid } from '@/lib/http'

function auditPath(leagueId: string): string {
  return `/api/leagues/${encodeURIComponent(leagueId)}/audit`
}

export interface JournalRequest {
  categories: readonly AuditCategory[]
  actorId: string | null
  from: string | null
  cursor: string | undefined
}

/** Fetches one page of the league admin Journal, newest first. */
export function fetchJournal(leagueId: string, request: JournalRequest): Promise<AuditPage> {
  const query = new URLSearchParams({ category: request.categories.join(',') })
  if (request.actorId !== null) query.set('actorId', request.actorId)
  if (request.from !== null) query.set('from', request.from)
  if (request.cursor !== undefined) query.set('cursor', request.cursor)
  return apiRequest(`${auditPath(leagueId)}?${query.toString()}`, { schema: auditPageSchema })
}

/** Records that the admin opened the Journal, clearing the failed-code alert. */
export function markJournalSeen(leagueId: string): Promise<void> {
  return apiRequestVoid(`${auditPath(leagueId)}/seen`, { method: 'POST' })
}
