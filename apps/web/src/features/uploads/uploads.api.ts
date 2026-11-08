import {
  createUploadResponseSchema,
  uploadDraftsResponseSchema,
  uploadQuotaSchema,
  uploadStateSchema,
  uploadStatesResponseSchema,
  type CompleteUploadBody,
  type CreateUploadBody,
  type CreateUploadResponse,
  type EditUploadBody,
  type UploadDraft,
  type UploadQuota,
  type UploadState,
} from '@storix/shared'
import { UserFacingError } from '@/features/errors/user-message'
import { apiRequest, apiRequestVoid } from '@/lib/http'

export const UPLOAD_FAILED_MESSAGE = "L'envoi de la photo a échoué."

const STATES_BATCH = 30
const DISCARD_BATCH = 60

export interface BucketTarget {
  url: string
  fields: Record<string, string>
}

function uploadsPath(leagueId: string, suffix = ''): string {
  return `/api/leagues/${encodeURIComponent(leagueId)}/uploads${suffix}`
}

function uploadPath(leagueId: string, uploadId: string, suffix = ''): string {
  return uploadsPath(leagueId, `/${encodeURIComponent(uploadId)}${suffix}`)
}

function chunk<T>(items: readonly T[], size: number): T[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, index * size + size),
  )
}

function abortError(): DOMException {
  return new DOMException('Upload aborted', 'AbortError')
}

/** Fetches how many photos the current member may still upload today. */
export function fetchUploadQuota(leagueId: string): Promise<UploadQuota> {
  return apiRequest(uploadsPath(leagueId, '/quota'), { schema: uploadQuotaSchema })
}

/** Reserves an upload and returns its presigned POST target. */
export function createUpload(
  leagueId: string,
  body: CreateUploadBody,
  signal?: AbortSignal,
): Promise<CreateUploadResponse> {
  return apiRequest(uploadsPath(leagueId), {
    method: 'POST',
    body,
    signal,
    schema: createUploadResponseSchema,
  })
}

/** Sends the photo straight to the bucket with XHR so the progress can be reported; policy fields first, file last. */
export function postToBucket(
  target: BucketTarget,
  blob: Blob,
  signal?: AbortSignal,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError())
      return
    }
    const form = new FormData()
    for (const [name, value] of Object.entries(target.fields)) form.append(name, value)
    form.append('file', blob, 'photo.jpg')
    const xhr = new XMLHttpRequest()
    const handleAbort = (): void => xhr.abort()
    const cleanup = (): void => signal?.removeEventListener('abort', handleAbort)
    xhr.open('POST', target.url)
    xhr.withCredentials = false
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress?.(event.loaded / event.total)
    }
    xhr.onload = () => {
      cleanup()
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1)
        resolve()
      } else {
        reject(new UserFacingError(UPLOAD_FAILED_MESSAGE))
      }
    }
    xhr.onerror = () => {
      cleanup()
      reject(new TypeError('Network error during the bucket upload'))
    }
    xhr.onabort = () => {
      cleanup()
      reject(abortError())
    }
    signal?.addEventListener('abort', handleAbort, { once: true })
    xhr.send(form)
  })
}

/** Declares the photo uploaded, which queues processing; without a title the upload stops at the staged draft. */
export function completeUpload(
  leagueId: string,
  uploadId: string,
  body: CompleteUploadBody,
  signal?: AbortSignal,
): Promise<UploadState> {
  return apiRequest(uploadPath(leagueId, uploadId, '/complete'), {
    method: 'POST',
    body,
    signal,
    schema: uploadStateSchema,
  })
}

/** Saves the title, tags or crop of a draft upload. */
export function editUpload(
  leagueId: string,
  uploadId: string,
  body: EditUploadBody,
  signal?: AbortSignal,
): Promise<UploadState> {
  return apiRequest(uploadPath(leagueId, uploadId), {
    method: 'PATCH',
    body,
    signal,
    schema: uploadStateSchema,
  })
}

/** Fetches the processing state of an upload. */
export function fetchUploadState(
  leagueId: string,
  uploadId: string,
  signal?: AbortSignal,
): Promise<UploadState> {
  return apiRequest(uploadPath(leagueId, uploadId), { schema: uploadStateSchema, signal })
}

/** Fetches the states of the member's own uploads, in request order; unknown ids are omitted. */
export async function fetchUploadStates(
  leagueId: string,
  ids: readonly string[],
  signal?: AbortSignal,
): Promise<UploadState[]> {
  const pages = await Promise.all(
    chunk(ids, STATES_BATCH).map((page) =>
      apiRequest(uploadsPath(leagueId, `/states?ids=${page.map(encodeURIComponent).join(',')}`), {
        schema: uploadStatesResponseSchema,
        signal,
      }),
    ),
  )
  return pages.flatMap((page) => page.states)
}

/** Lists the member's unpublished drafts in this league, oldest first. */
export async function fetchDrafts(leagueId: string): Promise<UploadDraft[]> {
  const response = await apiRequest(uploadsPath(leagueId, '/drafts'), {
    schema: uploadDraftsResponseSchema,
  })
  return response.drafts
}

/** Discards draft or pending uploads, which gives their quota back. */
export async function discardUploads(leagueId: string, ids: readonly string[]): Promise<void> {
  for (const page of chunk(ids, DISCARD_BATCH)) {
    await apiRequestVoid(uploadsPath(leagueId, '/discard'), {
      method: 'POST',
      body: { uploadIds: page },
    })
  }
}

/** Publishes staged drafts in stack order; resolves with their states. */
export async function publishUploads(
  leagueId: string,
  ids: readonly string[],
): Promise<UploadState[]> {
  const response = await apiRequest(uploadsPath(leagueId, '/publish'), {
    method: 'POST',
    body: { uploadIds: ids },
    schema: uploadStatesResponseSchema,
  })
  return response.states
}
