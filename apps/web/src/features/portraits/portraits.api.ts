import {
  createUploadResponseSchema,
  uploadStateSchema,
  type CreateUploadBody,
  type CreateUploadResponse,
  type UploadState,
} from '@storix/shared'
import { apiRequest, apiRequestVoid } from '@/lib/http'
import type { PortraitTarget } from './portrait-target'

function basePath(target: PortraitTarget): string {
  return target.kind === 'avatar'
    ? '/api/me/avatar'
    : `/api/leagues/${encodeURIComponent(target.leagueId)}/photo`
}

function uploadPath(target: PortraitTarget, uploadId: string, suffix = ''): string {
  return `${basePath(target)}/uploads/${encodeURIComponent(uploadId)}${suffix}`
}

/** Reserves a portrait upload and returns its presigned POST target. */
export function createPortraitUpload(
  target: PortraitTarget,
  body: CreateUploadBody,
  signal?: AbortSignal,
): Promise<CreateUploadResponse> {
  return apiRequest(`${basePath(target)}/uploads`, {
    method: 'POST',
    body,
    signal,
    schema: createUploadResponseSchema,
  })
}

/** Declares the portrait uploaded, which queues its processing. */
export function completePortraitUpload(
  target: PortraitTarget,
  uploadId: string,
  signal?: AbortSignal,
): Promise<UploadState> {
  return apiRequest(uploadPath(target, uploadId, '/complete'), {
    method: 'POST',
    body: {},
    signal,
    schema: uploadStateSchema,
  })
}

/** Fetches the processing state of a portrait upload. */
export function fetchPortraitUploadState(
  target: PortraitTarget,
  uploadId: string,
  signal?: AbortSignal,
): Promise<UploadState> {
  return apiRequest(uploadPath(target, uploadId), { schema: uploadStateSchema, signal })
}

/** Removes the current portrait; succeeds when there is none. */
export function deletePortrait(target: PortraitTarget): Promise<void> {
  return apiRequestVoid(basePath(target), { method: 'DELETE' })
}
