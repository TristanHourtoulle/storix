import {
  createMomentUploadsResponseSchema,
  currentMomentSchema,
  postMomentResponseSchema,
  type CreateMomentUploadsResponse,
  type CurrentMoment,
  type PostMomentBody,
  type PostMomentResponse,
} from '@storix/shared'
import { apiRequest } from '@/lib/http'

function momentsPath(leagueId: string, suffix = ''): string {
  return `/api/leagues/${encodeURIComponent(leagueId)}/moments${suffix}`
}

/** Fetches the Moment the viewer can post for (the latest one that fired) and their post, if any. */
export function fetchCurrentMoment(leagueId: string): Promise<CurrentMoment> {
  return apiRequest(momentsPath(leagueId, '/current'), { schema: currentMomentSchema })
}

/** Reserves the back-camera and selfie uploads of a Moment, outside the daily quota. */
export function createMomentUploads(leagueId: string): Promise<CreateMomentUploadsResponse> {
  return apiRequest(momentsPath(leagueId, '/uploads'), {
    method: 'POST',
    body: {},
    schema: createMomentUploadsResponseSchema,
  })
}

/** Posts the Moment once both photos reached the bucket. */
export function postMoment(leagueId: string, body: PostMomentBody): Promise<PostMomentResponse> {
  return apiRequest(momentsPath(leagueId), {
    method: 'POST',
    body,
    schema: postMomentResponseSchema,
  })
}
