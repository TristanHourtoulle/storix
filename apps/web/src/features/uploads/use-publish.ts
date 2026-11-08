import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { publishProblemSchema, type PublishProblem, type UploadState } from '@storix/shared'
import { userMessage } from '@/features/errors/user-message'
import { playSound } from '@/features/sound/sound'
import { ApiError } from '@/lib/http'
import { logger } from '@/lib/logger'
import { isBlankTitle, type StackCard } from './session/session-reducer'
import type { UploadSession } from './session/use-upload-session'
import { fetchUploadStates, publishUploads } from './uploads.api'
import { draftsQueryKey } from './use-drafts'
import { uploadQuotaQueryKey } from './use-upload-quota'

const POLL_INTERVAL_MS = 1500
const POLL_TIMEOUT_MS = 180_000

const CROP_RESET_NOTICE = 'Cadrage réinitialisé'
const UNSAVED_NOTICE =
  "Certaines modifications n'ont pas pu être enregistrées. Vérifie ta connexion, puis publie à nouveau."
const PUBLISH_BACKGROUND_NOTICE = 'La publication continue en arrière-plan.'

const problemsSchema = z.object({ problems: z.array(publishProblemSchema) })

export interface PublishProgress {
  done: number
  total: number
}

/** The cards a publish sends: staged, titled, in stack order (M15). */
function publishableUploads(cards: readonly StackCard[]): StackCard[] {
  return cards.filter((card) => card.phase === 'staged' && card.uploadId && !isBlankTitle(card))
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer)
        resolve()
      },
      { once: true },
    )
  })
}

function problemsOf(error: unknown): PublishProblem[] | null {
  if (!(error instanceof ApiError) || error.code !== 'PUBLISH_REJECTED') return null
  const parsed = problemsSchema.safeParse(error.details)
  return parsed.success ? parsed.data.problems : []
}

function countReady(states: readonly UploadState[]): number {
  return states.filter((state) => state.status === 'ready').length
}

/** Publishes the stack: flush, publish, poll until the worker made the cards, then sound and refresh. */
export function usePublish(leagueId: string, session: UploadSession) {
  const queryClient = useQueryClient()
  const [isPublishing, setIsPublishing] = useState(false)
  const [progress, setProgress] = useState<PublishProgress>({ done: 0, total: 0 })
  const sessionRef = useRef(session)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => {
    sessionRef.current = session
  })

  useEffect(() => () => controllerRef.current?.abort(), [])

  const handleProblems = useCallback((problems: readonly PublishProblem[]): void => {
    const current = sessionRef.current
    const { cards } = current.state
    const cardOf = (uploadId: string): StackCard | undefined =>
      cards.find((card) => card.uploadId === uploadId)
    let hasCropReset = false
    for (const problem of problems) {
      const card = cardOf(problem.uploadId)
      if (!card) continue
      if (problem.reason === 'CROP_INVALID') {
        hasCropReset = true
        current.edit(card.localId, { crop: null })
      } else if (problem.reason === 'NOT_FOUND' || problem.reason === 'NOT_PUBLISHABLE') {
        void current.remove(card.localId)
      }
    }
    if (hasCropReset) current.dispatch({ type: 'notice', notice: CROP_RESET_NOTICE })
    const untitled = problems.find((problem) => problem.reason === 'TITLE_REQUIRED')
    const untitledIndex = untitled
      ? cards.findIndex((card) => card.uploadId === untitled.uploadId)
      : -1
    if (untitledIndex >= 0) current.goTo(untitledIndex)
    else current.dispatch({ type: 'screen', screen: 'summary' })
  }, [])

  const poll = useCallback(
    async (ids: readonly string[], signal: AbortSignal): Promise<number> => {
      const startedAt = Date.now()
      let ready = 0
      while (!signal.aborted && Date.now() - startedAt < POLL_TIMEOUT_MS) {
        await delay(POLL_INTERVAL_MS, signal)
        if (signal.aborted) break
        try {
          const states = await fetchUploadStates(leagueId, ids, signal)
          ready = countReady(states)
          setProgress({ done: ready, total: ids.length })
          if (!states.some((state) => state.status === 'publishing')) return ready
        } catch (error) {
          logger.warn('Publish progress poll failed', { error })
        }
      }
      if (!signal.aborted)
        sessionRef.current.dispatch({ type: 'notice', notice: PUBLISH_BACKGROUND_NOTICE })
      return ready
    },
    [leagueId],
  )

  const publish = useCallback(async (): Promise<void> => {
    if (controllerRef.current) return
    const controller = new AbortController()
    controllerRef.current = controller
    const current = sessionRef.current
    setIsPublishing(true)
    try {
      if (!(await current.flush())) {
        current.dispatch({ type: 'notice', notice: UNSAVED_NOTICE })
        return
      }
      const cards = publishableUploads(sessionRef.current.state.cards)
      const ids = cards.flatMap((card) => (card.uploadId ? [card.uploadId] : []))
      if (ids.length === 0) return
      setProgress({ done: 0, total: ids.length })
      current.dispatch({ type: 'notice', notice: null })
      current.dispatch({ type: 'screen', screen: 'publishing' })
      try {
        const states = await publishUploads(leagueId, ids)
        setProgress({ done: countReady(states), total: ids.length })
      } catch (error) {
        const problems = problemsOf(error)
        if (problems === null) throw error
        handleProblems(problems)
        return
      }
      const count = await poll(ids, controller.signal)
      if (controller.signal.aborted) return
      const { duplicates } = sessionRef.current.stats
      current.dispatch({ type: 'publishProgress', count, duplicates })
      current.dispatch({ type: 'screen', screen: 'done' })
      if (count >= 1) playSound({ name: 'cardCreated' })
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['leagues', leagueId, 'cards'] }),
        queryClient.invalidateQueries({ queryKey: uploadQuotaQueryKey(leagueId) }),
        queryClient.invalidateQueries({ queryKey: draftsQueryKey(leagueId) }),
      ])
    } catch (error) {
      logger.warn('Publish failed', { error })
      if (!controller.signal.aborted) {
        current.dispatch({ type: 'screen', screen: 'summary' })
        current.dispatch({ type: 'notice', notice: userMessage(error) })
      }
    } finally {
      controllerRef.current = null
      if (!controller.signal.aborted) setIsPublishing(false)
    }
  }, [handleProblems, leagueId, poll, queryClient])

  return { publish, isPublishing, progress }
}
