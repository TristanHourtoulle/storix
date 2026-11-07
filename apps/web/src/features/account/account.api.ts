import {
  accountDeletionPreviewSchema,
  meResponseSchema,
  type AccountDeletionPreview,
  type DeleteAccountBody,
  type MeResponse,
  type UpdateDisplayNameBody,
} from '@storix/shared'
import { apiRequest, apiRequestVoid } from '@/lib/http'

/** Fetches what deleting the account would remove, block or keep. */
export function fetchAccountDeletionPreview(): Promise<AccountDeletionPreview> {
  return apiRequest('/api/me/account-deletion', { schema: accountDeletionPreviewSchema })
}

/** Permanently deletes the current account. */
export function deleteAccount(body: DeleteAccountBody): Promise<void> {
  return apiRequestVoid('/api/me', { method: 'DELETE', body })
}

/** Changes the display name; the login username stays untouched. */
export function updateDisplayName(body: UpdateDisplayNameBody): Promise<MeResponse> {
  return apiRequest('/api/me', { method: 'PATCH', body, schema: meResponseSchema })
}
