import {
  createUploadResponseSchema,
  uploadQuotaSchema,
  uploadStateSchema,
  type CompleteUploadBody,
  type CreateUploadBody,
  type CreateUploadResponse,
  type UploadQuota,
  type UploadState,
} from '@storix/shared'
import { UserFacingError } from '@/features/errors/user-message'
import { apiRequest } from '@/lib/http'

export interface BucketTarget {
  url: string
  fields: Record<string, string>
}

function uploadsPath(leagueId: string, suffix = ''): string {
  return `/api/leagues/${encodeURIComponent(leagueId)}/uploads${suffix}`
}

/** Fetches how many photos the current member may still upload today. */
export function fetchUploadQuota(leagueId: string): Promise<UploadQuota> {
  return apiRequest(uploadsPath(leagueId, '/quota'), { schema: uploadQuotaSchema })
}

/** Reserves an upload and returns its presigned POST target. */
export function createUpload(
  leagueId: string,
  body: CreateUploadBody,
): Promise<CreateUploadResponse> {
  return apiRequest(uploadsPath(leagueId), {
    method: 'POST',
    body,
    schema: createUploadResponseSchema,
  })
}

/** Sends the photo straight to the bucket; policy fields first, file last. */
export async function postToBucket(target: BucketTarget, blob: Blob): Promise<void> {
  const form = new FormData()
  for (const [name, value] of Object.entries(target.fields)) form.append(name, value)
  form.append('file', blob, 'photo.jpg')
  const response = await fetch(target.url, { method: 'POST', body: form, credentials: 'omit' })
  if (!response.ok) throw new UserFacingError("L'envoi de la photo a échoué.")
}

/** Declares the photo uploaded with its card metadata, which queues processing. */
export function completeUpload(
  leagueId: string,
  uploadId: string,
  body: CompleteUploadBody,
): Promise<UploadState> {
  return apiRequest(uploadsPath(leagueId, `/${encodeURIComponent(uploadId)}/complete`), {
    method: 'POST',
    body,
    schema: uploadStateSchema,
  })
}

/** Fetches the processing state of an upload. */
export function fetchUploadState(leagueId: string, uploadId: string): Promise<UploadState> {
  return apiRequest(uploadsPath(leagueId, `/${encodeURIComponent(uploadId)}`), {
    schema: uploadStateSchema,
  })
}
