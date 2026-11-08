import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { AccountDeletionPreview, DeleteAccountBody } from '@storix/shared'
import { signInWithPasskey } from '@/features/auth/use-login'
import { userMessage } from '@/features/errors/user-message'
import { purgeAllCaches } from '@/features/privacy/purge-cache'
import { dropLocalSubscription } from '@/features/push/push-browser'
import { ApiError } from '@/lib/http'
import { logger } from '@/lib/logger'
import { setLoggingOut } from '@/lib/session-state'
import { removeUserStorage } from '@/lib/storage'
import { deleteAccount, fetchAccountDeletionPreview } from './account.api'

const PREVIEW_QUERY_KEY = ['me', 'account-deletion'] as const

const STALE_PREVIEW_CODES = new Set(['OWNERSHIP_TRANSFER_REQUIRED', 'REAUTH_REQUIRED'])

/** Account deletion flow: preview, passkey re-authentication and the final deletion. */
export function useAccountDeletion(
  userId: string,
  isEnabled: boolean,
): {
  preview: AccountDeletionPreview | null
  isPreviewLoading: boolean
  reauthWithPasskey: () => void
  deleteAccount: (body: DeleteAccountBody) => void
  isPending: boolean
  error: string | null
} {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const previewQuery = useQuery({
    queryKey: PREVIEW_QUERY_KEY,
    queryFn: fetchAccountDeletionPreview,
    enabled: isEnabled,
    staleTime: 0,
    networkMode: 'online',
  })

  const refreshPreview = (): void => {
    void queryClient.invalidateQueries({ queryKey: PREVIEW_QUERY_KEY })
  }

  const reauth = useMutation({
    mutationFn: signInWithPasskey,
    onSuccess: refreshPreview,
  })

  const deletion = useMutation({
    meta: { sound: 'error-only' },
    mutationFn: async (body: DeleteAccountBody): Promise<void> => {
      await deleteAccount(body)
      await dropLocalSubscription().catch((error: unknown) => {
        logger.warn('Push local unsubscribe after account deletion failed', { error })
      })
      setLoggingOut(true)
      try {
        await navigate({ to: '/login', search: { deleted: 1 }, replace: true })
        await queryClient.cancelQueries()
        queryClient.clear()
        await purgeAllCaches()
        removeUserStorage(userId)
      } finally {
        setLoggingOut(false)
      }
    },
    onError: (error) => {
      logger.warn('Account deletion failed', {
        code: error instanceof ApiError ? error.code : undefined,
      })
      if (error instanceof ApiError && STALE_PREVIEW_CODES.has(error.code)) refreshPreview()
    },
  })

  const failure = deletion.error ?? reauth.error ?? previewQuery.error

  return {
    preview: previewQuery.data ?? null,
    isPreviewLoading: previewQuery.isPending && isEnabled,
    reauthWithPasskey: () => {
      deletion.reset()
      reauth.mutate()
    },
    deleteAccount: (body) => {
      reauth.reset()
      deletion.mutate(body)
    },
    isPending: deletion.isPending || reauth.isPending,
    error: failure ? userMessage(failure) : null,
  }
}
