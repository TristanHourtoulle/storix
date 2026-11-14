import {
  eventListSchema,
  eventSummarySchema,
  type EventBody,
  type EventList,
  type EventPatch,
  type EventSummary,
} from '@storix/shared'
import { apiRequest, apiRequestVoid } from '@/lib/http'

function eventsPath(leagueId: string, seriesId?: string): string {
  const base = `/api/leagues/${encodeURIComponent(leagueId)}/series/events`
  return seriesId === undefined ? base : `${base}/${encodeURIComponent(seriesId)}`
}

/** Fetches the league's events that are not closed: live, in their grace window and upcoming. */
export function fetchEvents(leagueId: string): Promise<EventList> {
  return apiRequest(eventsPath(leagueId), { schema: eventListSchema })
}

/** Schedules an event. */
export function createEvent(leagueId: string, body: EventBody): Promise<EventSummary> {
  return apiRequest(eventsPath(leagueId), { method: 'POST', body, schema: eventSummarySchema })
}

/** Edits an event before its start; creator or admin. */
export function updateEvent(
  leagueId: string,
  seriesId: string,
  patch: EventPatch,
): Promise<EventSummary> {
  return apiRequest(eventsPath(leagueId, seriesId), {
    method: 'PATCH',
    body: patch,
    schema: eventSummarySchema,
  })
}

/** Cancels an event before its start; creator or admin. */
export function cancelEvent(leagueId: string, seriesId: string): Promise<void> {
  return apiRequestVoid(eventsPath(leagueId, seriesId), { method: 'DELETE' })
}

/** Ends a live event now; its 12 h grace window starts. */
export function endEvent(leagueId: string, seriesId: string): Promise<EventSummary> {
  return apiRequest(`${eventsPath(leagueId, seriesId)}/end`, {
    method: 'POST',
    schema: eventSummarySchema,
  })
}
