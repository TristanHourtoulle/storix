import {
  accountDeletionPreviewSchema,
  type AccountDeletionPreview,
  type DeleteAccountBody,
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
