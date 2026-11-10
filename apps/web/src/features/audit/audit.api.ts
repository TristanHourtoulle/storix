import {
  auditCountSchema,
  auditPageSchema,
  type AuditCategory,
  type AuditCount,
  type AuditPage,
} from '@storix/shared'
import { apiRequest, apiRequestVoid } from '@/lib/http'

function auditPath(leagueId: string): string {
  return `/api/leagues/${encodeURIComponent(leagueId)}/audit`
}

export interface JournalFilterRequest {
  categories: readonly AuditCategory[]
  memberId: string | null
  from: string | null
}

export interface JournalRequest extends JournalFilterRequest {
  cursor: string | undefined
}

function filterQuery(request: JournalFilterRequest): URLSearchParams {
  const query = new URLSearchParams({ category: request.categories.join(',') })
  if (request.memberId !== null) query.set('memberId', request.memberId)
  if (request.from !== null) query.set('from', request.from)
  return query
}

/** Counts the Journal lines a filter set would show. */
export function fetchJournalCount(
  leagueId: string,
  request: JournalFilterRequest,
): Promise<AuditCount> {
  return apiRequest(`${auditPath(leagueId)}/count?${filterQuery(request).toString()}`, {
    schema: auditCountSchema,
  })
}

/** Fetches one page of the league admin Journal, newest first. */
export function fetchJournal(leagueId: string, request: JournalRequest): Promise<AuditPage> {
  const query = filterQuery(request)
  if (request.cursor !== undefined) query.set('cursor', request.cursor)
  return apiRequest(`${auditPath(leagueId)}?${query.toString()}`, { schema: auditPageSchema })
}

/** Records that the admin opened the Journal, clearing the failed-code alert. */
export function markJournalSeen(leagueId: string): Promise<void> {
  return apiRequestVoid(`${auditPath(leagueId)}/seen`, { method: 'POST' })
}
