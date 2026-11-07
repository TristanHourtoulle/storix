import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { cardTitleSchema } from '@storix/shared'
import {
  processDrafts,
  waitForNetwork,
  type PipelineContext,
  type UploadProgress,
} from './upload-pipeline'
import { uploadQuotaQueryKey } from './use-upload-quota'
import type { DraftPhase, PhaseExtra, PhotoDraft } from './use-photo-drafts'

const PARALLEL_UPLOADS = 2
const SETTLED_PHASES: ReadonlySet<DraftPhase> = new Set(['created', 'duplicate', 'error'])

type SetPhase = (id: string, phase: DraftPhase, extra?: PhaseExtra) => void

/** Returns whether a draft can be sent: prepared, still pending and with a valid title. */
export function isSendable(draft: PhotoDraft): boolean {
  return (
    draft.phase === 'ready' &&
    draft.photo !== null &&
    cardTitleSchema.safeParse(draft.title).success
  )
}

/** Turns ready drafts into cards, retrying network failures while the screen stays mounted. */
export function useCreateCards(
  leagueId: string,
  drafts: readonly PhotoDraft[],
  setPhase: SetPhase,
) {
  const queryClient = useQueryClient()
  const [isRunning, setIsRunning] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const isRunningRef = useRef(false)
  const controllerRef = useRef<AbortController | null>(null)
  const progressRef = useRef<Readonly<Record<string, UploadProgress>>>({})

  useEffect(() => {
    const controller = new AbortController()
    controllerRef.current = controller
    return () => controller.abort()
  }, [])

  const start = useCallback((): void => {
    const controller = controllerRef.current
    const queue = drafts.filter(isSendable)
    if (!controller || isRunningRef.current || queue.length === 0) return
    isRunningRef.current = true
    setIsRunning(true)
    setHasStarted(true)

    const ctx: PipelineContext = {
      leagueId,
      signal: controller.signal,
      readProgress: (draftId) => progressRef.current[draftId],
      saveProgress: (draftId, progress) => {
        progressRef.current = { ...progressRef.current, [draftId]: progress }
      },
      setPhase,
    }

    const run = async (): Promise<void> => {
      let pending: readonly PhotoDraft[] = queue
      while (pending.length > 0 && !controller.signal.aborted) {
        const offline = await processDrafts(ctx, pending, PARALLEL_UPLOADS)
        if (offline.length === 0) break
        await waitForNetwork(controller.signal)
        pending = offline
      }
    }

    void run().finally(() => {
      isRunningRef.current = false
      setIsRunning(false)
      void queryClient.invalidateQueries({ queryKey: ['leagues', leagueId, 'cards'] })
      void queryClient.invalidateQueries({ queryKey: uploadQuotaQueryKey(leagueId) })
    })
  }, [drafts, leagueId, queryClient, setPhase])

  const isDone =
    hasStarted &&
    !isRunning &&
    drafts.length > 0 &&
    drafts.every((draft) => SETTLED_PHASES.has(draft.phase))

  return { start, isRunning, isDone, hasStarted }
}
