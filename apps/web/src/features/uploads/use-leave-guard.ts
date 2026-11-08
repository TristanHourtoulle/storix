import { useCallback, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useBlocker, type ShouldBlockFn } from '@tanstack/react-router'
import type { UploadDraft } from '@storix/shared'
import { showToast } from '@/components/ui/toast'
import { logger } from '@/lib/logger'
import type { UploadSession } from './session/use-upload-session'
import { draftsQueryKey, useDiscardDrafts } from './use-drafts'

const DRAFT_DISCARDED_TOAST = 'Brouillon supprimé'

function isEditing(session: UploadSession): boolean {
  const { screen, cards } = session.state
  return (screen === 'stack' || screen === 'summary') && cards.length > 0
}

/**
 * Guards leaving the add flow with "Quitter l'ajout ?" (R21): router navigations are held by the
 * blocker, and the native prompt shows only while photos are still unsent.
 */
export function useLeaveGuard(
  leagueId: string,
  session: UploadSession,
  drafts: readonly UploadDraft[],
) {
  const queryClient = useQueryClient()
  const discardDrafts = useDiscardDrafts(leagueId)
  const sessionRef = useRef(session)
  const draftsRef = useRef(drafts)

  useEffect(() => {
    sessionRef.current = session
    draftsRef.current = drafts
  })

  const shouldBlockFn = useCallback<ShouldBlockFn>(
    ({ current, next }) => current.routeId !== next.routeId && isEditing(sessionRef.current),
    [],
  )
  const enableBeforeUnload = useCallback((): boolean => sessionRef.current.stats.unsent > 0, [])
  const blocker = useBlocker({ shouldBlockFn, enableBeforeUnload, withResolver: true })
  const { proceed, reset } = blocker

  const keep = useCallback(async (): Promise<void> => {
    const current = sessionRef.current
    await current.flush()
    current.abortUnsent()
    await queryClient.invalidateQueries({ queryKey: draftsQueryKey(leagueId) })
    proceed?.()
  }, [leagueId, proceed, queryClient])

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
    proceed?.()
  }, [discardDrafts, proceed])

  const stay = useCallback((): void => reset?.(), [reset])

  return { isOpen: blocker.status === 'blocked', keep, stay, discardAll }
}
