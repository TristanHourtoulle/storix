import { useCallback, useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { meQueryOptions } from '@/features/auth/session.queries'
import { logger } from '@/lib/logger'
import { isIos, isStandalone } from '@/lib/platform'
import {
  getCurrentSubscription,
  isPushSupported,
  refreshThisDevice,
  saveThisDevice,
  subscribeThisDevice,
  unsubscribeThisDevice,
} from './push-browser'
import { pushConfigQueryOptions } from './push.queries'
import type { PushStatus } from './push-status'

const DENIED_MESSAGE = 'Autorise les notifications dans les réglages du navigateur.'
const ENABLE_FAILED_MESSAGE = "Impossible d'activer les notifications."
const DISABLE_FAILED_MESSAGE = 'Impossible de désactiver les notifications.'

let hasRefreshedThisLoad = false

type PlatformStatus = Extract<PushStatus, 'needs-install' | 'unsupported'> | null

function platformStatus(): PlatformStatus {
  if (isIos() && !isStandalone()) return 'needs-install'
  return isPushSupported() ? null : 'unsupported'
}

function refreshSubscription(
  publicKey: string,
  userId: string | undefined,
  onUnsubscribed: () => void,
): void {
  hasRefreshedThisLoad = true
  refreshThisDevice(publicKey, userId)
    .then((isSubscribed) => {
      if (!isSubscribed) onUnsubscribed()
    })
    .catch((error: unknown) => {
      logger.warn('Push subscription refresh failed', { error })
    })
}

function isPermissionDenied(): boolean {
  return Notification.permission === 'denied'
}

/** Push notification status of this device, with enable and disable actions. */
export function usePushNotifications(): {
  status: PushStatus
  isReady: boolean
  enable: () => Promise<void>
  disable: () => Promise<void>
  isPending: boolean
  errorMessage: string | null
} {
  const queryClient = useQueryClient()
  const [platform] = useState(platformStatus)
  const isCapable = platform === null
  const config = useQuery({ ...pushConfigQueryOptions, enabled: isCapable })
  const [subscription, setSubscription] = useState<PushSubscription | null | undefined>(
    isCapable ? undefined : null,
  )
  const [isPending, setIsPending] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!isCapable) return
    let isActive = true
    getCurrentSubscription()
      .catch((error: unknown) => {
        logger.warn('Push subscription read failed', { error })
        return null
      })
      .then((current) => {
        if (isActive) setSubscription(current)
      })
    return () => {
      isActive = false
    }
  }, [isCapable])

  const isConfigOffline = config.isPending && config.fetchStatus === 'paused'
  const isConfigUnavailable = config.isError || isConfigOffline
  const publicKey = config.data?.publicKey
  const status = resolveStatus(platform, isConfigUnavailable, publicKey, subscription)
  const isReady =
    !isCapable || ((!config.isPending || isConfigOffline) && subscription !== undefined)

  useEffect(() => {
    if (!isReady || status !== 'enabled' || !publicKey || hasRefreshedThisLoad) return
    const userId = queryClient.getQueryData(meQueryOptions.queryKey)?.user.id
    refreshSubscription(publicKey, userId, () => setSubscription(null))
  }, [isReady, status, publicKey, queryClient])

  const enable = useCallback(async (): Promise<void> => {
    const publicKey = queryClient.getQueryData(pushConfigQueryOptions.queryKey)?.publicKey
    if (!publicKey) {
      setErrorMessage(ENABLE_FAILED_MESSAGE)
      return
    }
    const subscribing = subscribeThisDevice(publicKey)
    setIsPending(true)
    setErrorMessage(null)
    try {
      const body = await subscribing
      try {
        await saveThisDevice(body, queryClient.getQueryData(meQueryOptions.queryKey)?.user.id)
      } catch (error) {
        await unsubscribeThisDevice().catch(() => undefined)
        throw error
      }
      hasRefreshedThisLoad = true
      setSubscription(await getCurrentSubscription())
    } catch (error) {
      const isRefused = error instanceof Error && error.message === 'denied'
      if (!isRefused) logger.warn('Push enable failed', { error })
      setErrorMessage(isRefused && isPermissionDenied() ? DENIED_MESSAGE : ENABLE_FAILED_MESSAGE)
      setSubscription(await getCurrentSubscription().catch(() => null))
    } finally {
      setIsPending(false)
    }
  }, [queryClient])

  const disable = useCallback(async (): Promise<void> => {
    setIsPending(true)
    setErrorMessage(null)
    try {
      await unsubscribeThisDevice()
      setSubscription(null)
    } catch (error) {
      logger.warn('Push disable failed', { error })
      setErrorMessage(DISABLE_FAILED_MESSAGE)
      setSubscription(await getCurrentSubscription().catch(() => null))
    } finally {
      setIsPending(false)
    }
  }, [])

  return { status, isReady, enable, disable, isPending, errorMessage }
}

function resolveStatus(
  platform: PlatformStatus,
  isConfigUnavailable: boolean,
  publicKey: string | null | undefined,
  subscription: PushSubscription | null | undefined,
): PushStatus {
  if (platform) return platform
  if (isConfigUnavailable || publicKey === null) return 'unavailable'
  if (isPermissionDenied()) return 'denied'
  return subscription ? 'enabled' : 'disabled'
}
