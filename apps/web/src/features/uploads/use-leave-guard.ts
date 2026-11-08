import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useBlocker, type ShouldBlockFn } from '@tanstack/react-router'
import type { UploadDraft } from '@storix/shared'
import { showToast } from '@/components/ui/toast'
import { logger } from '@/lib/logger'
import type { UploadSession } from './session/use-upload-session'
import { draftsQueryKey, useDiscardDrafts } from './use-drafts'

const DRAFT_DISCARDED_TOAST = 'Brouillon supprimé'

type OverlayCloser = (() => void) | null

function isEditing(session: UploadSession): boolean {
  const { screen, cards } = session.state
  return (screen === 'stack' || screen === 'summary') && cards.length > 0
}

function leagueOf(params: object): unknown {
  return 'leagueId' in params ? params.leagueId : undefined
}

/**
 * Guards leaving the add flow with "Quitter l'ajout ?" (R21): router navigations, the Android back
 * gesture included, are held by the blocker, and the native prompt shows only while photos are still
 * unsent. A navigation while an overlay (the crop editor) is open only closes that overlay.
 */
export function useLeaveGuard(
  leagueId: string,
  session: UploadSession,
  drafts: readonly UploadDraft[],
) {
  const queryClient = useQueryClient()
  const discardDrafts = useDiscardDrafts(leagueId)
  const [isOpen, setIsOpen] = useState(false)
  const sessionRef = useRef(session)
  const draftsRef = useRef(drafts)
  const overlayRef = useRef<OverlayCloser>(null)
  const resolveRef = useRef<((shouldStay: boolean) => void) | null>(null)

  useEffect(() => {
    sessionRef.current = session
    draftsRef.current = drafts
  })

  const settle = useCallback((shouldStay: boolean): void => {
    resolveRef.current?.(shouldStay)
    resolveRef.current = null
    setIsOpen(false)
  }, [])

  useEffect(() => () => resolveRef.current?.(false), [])

  const shouldBlockFn = useCallback<ShouldBlockFn>(({ current, next }) => {
    const isLeaving =
      current.routeId !== next.routeId || leagueOf(current.params) !== leagueOf(next.params)
    if (!isLeaving || !isEditing(sessionRef.current)) return false
    const closeOverlay = overlayRef.current
    if (closeOverlay) {
      closeOverlay()
      return true
    }
    resolveRef.current?.(true)
    setIsOpen(true)
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve
    })
  }, [])
  const enableBeforeUnload = useCallback((): boolean => sessionRef.current.stats.unsent > 0, [])
  useBlocker({ shouldBlockFn, enableBeforeUnload })

  const keep = useCallback(async (): Promise<void> => {
    const current = sessionRef.current
    await current.flush()
    current.abortUnsent()
    await queryClient.invalidateQueries({ queryKey: draftsQueryKey(leagueId) })
    settle(false)
  }, [leagueId, queryClient, settle])

  const discardAll = useCallback(async (): Promise<void> => {
    const current = sessionRef.current
    const known = new Set(current.state.cards.map((card) => card.uploadId))
    const others = draftsRef.current.filter((draft) => !known.has(draft.uploadId))
    await current.discardAll()
    if (others.length > 0) {
      await discardDrafts.mutateAsync(others).catch((error: unknown) => {
        logger.warn('Other drafts discard failed', { error })
      })
    }
    showToast(DRAFT_DISCARDED_TOAST)
    settle(false)
  }, [discardDrafts, settle])

  const stay = useCallback((): void => settle(true), [settle])

  const setOverlayCloser = useCallback((close: OverlayCloser): void => {
    overlayRef.current = close
  }, [])

  return { isOpen, keep, stay, discardAll, setOverlayCloser }
}
