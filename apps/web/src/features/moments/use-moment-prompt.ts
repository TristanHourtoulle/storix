import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { CurrentMoment } from '@storix/shared'
import { useCallback, useEffect, useState } from 'react'
import { dismissFlash, isFlashDismissed } from './moment-dismissal'
import { currentMomentQueryKey, currentMomentQueryOptions } from './moments.queries'
import { useNow } from './use-now'

const FIRE_SLACK_MS = 250
const MAX_TIMER_MS = 24 * 3_600_000

export interface MomentPrompt {
  moment: CurrentMoment
  firesAt: Date
  isWindowOpen: boolean
  remainingMs: number
  isFlashShown: boolean
  isBannerShown: boolean
  lateMinutesNow: number
  dismiss(): void
}

/** Derives what the home shows for the current Moment: the full-screen flash during its window, else a banner until posted. */
export function useMomentPrompt(leagueId: string): MomentPrompt | null {
  const queryClient = useQueryClient()
  const { data: moment } = useQuery(currentMomentQueryOptions(leagueId))
  const nextFiresAt = moment?.nextFiresAt
  useEffect(() => {
    if (nextFiresAt === undefined) return
    const delay = new Date(nextFiresAt).getTime() - Date.now()
    if (delay < 0 || delay > MAX_TIMER_MS) return
    const timer = window.setTimeout(() => {
      void queryClient.invalidateQueries({ queryKey: currentMomentQueryKey(leagueId) })
    }, delay + FIRE_SLACK_MS)
    return () => window.clearTimeout(timer)
  }, [leagueId, nextFiresAt, queryClient])
  const [dismissedDay, setDismissedDay] = useState<string | null>(null)
  const isPending = moment !== undefined && moment.post === null
  const now = useNow(isPending)
  const dismiss = useCallback(() => {
    if (moment === undefined) return
    dismissFlash(leagueId, moment.day)
    setDismissedDay(moment.day)
  }, [leagueId, moment])

  if (moment === undefined || moment.post !== null) return null
  const firesAt = new Date(moment.firesAt)
  const windowEndsAt = new Date(moment.windowEndsAt)
  const remainingMs = windowEndsAt.getTime() - now.getTime()
  const isWindowOpen = now.getTime() >= firesAt.getTime() && remainingMs > 0
  const isDismissed = dismissedDay === moment.day || isFlashDismissed(leagueId, moment.day)
  return {
    moment,
    firesAt,
    isWindowOpen,
    remainingMs: Math.max(0, remainingMs),
    isFlashShown: isWindowOpen && !isDismissed,
    isBannerShown: !isWindowOpen || isDismissed,
    lateMinutesNow: Math.max(0, Math.floor((now.getTime() - firesAt.getTime()) / 60_000)),
    dismiss,
  }
}
