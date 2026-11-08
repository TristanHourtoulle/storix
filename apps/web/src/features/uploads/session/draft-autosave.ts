import type { EditUploadBody } from '@storix/shared'
import { ApiError } from '@/lib/http'
import { logger } from '@/lib/logger'

const DEFAULT_DELAY_MS = 600

export interface DraftAutosaveInput {
  save: (uploadId: string, body: EditUploadBody) => Promise<void>
  onConflict: (uploadId: string) => void
  delayMs?: number
}

export interface DraftAutosave {
  schedule(uploadId: string, patch: EditUploadBody): void
  flush(): Promise<void>
  cancel(uploadId: string): void
}

function without<V>(map: ReadonlyMap<string, V>, key: string): ReadonlyMap<string, V> {
  return new Map([...map].filter(([id]) => id !== key))
}

function isConflict(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409
}

/** Debounced per-upload PATCH queue: later fields win, a 409 reports a conflict, other failures retry once. */
export function createDraftAutosave({
  save,
  onConflict,
  delayMs = DEFAULT_DELAY_MS,
}: DraftAutosaveInput): DraftAutosave {
  let pending: ReadonlyMap<string, EditUploadBody> = new Map()
  let timers: ReadonlyMap<string, number> = new Map()
  let inFlight: ReadonlyMap<string, Promise<void>> = new Map()
  let retried: ReadonlySet<string> = new Set()

  const clearTimer = (uploadId: string): void => {
    const timer = timers.get(uploadId)
    if (timer !== undefined) window.clearTimeout(timer)
    timers = without(timers, uploadId)
  }

  const requeue = (uploadId: string, body: EditUploadBody): void => {
    pending = new Map(pending).set(uploadId, { ...body, ...pending.get(uploadId) })
  }

  const send = async (uploadId: string, body: EditUploadBody): Promise<void> => {
    try {
      await save(uploadId, body)
      retried = new Set([...retried].filter((id) => id !== uploadId))
    } catch (error) {
      if (isConflict(error)) {
        pending = without(pending, uploadId)
        onConflict(uploadId)
        return
      }
      if (retried.has(uploadId)) {
        logger.warn('Draft save dropped after a retry', { uploadId, error })
        retried = new Set([...retried].filter((id) => id !== uploadId))
        return
      }
      logger.warn('Draft save failed, retrying on the next flush', { uploadId, error })
      retried = new Set([...retried, uploadId])
      requeue(uploadId, body)
    }
  }

  const sendOne = (uploadId: string): Promise<void> => {
    clearTimer(uploadId)
    const body = pending.get(uploadId)
    const previous = inFlight.get(uploadId) ?? Promise.resolve()
    if (!body) return previous
    pending = without(pending, uploadId)
    const run = previous.then(() => send(uploadId, body))
    inFlight = new Map(inFlight).set(uploadId, run)
    void run.finally(() => {
      if (inFlight.get(uploadId) === run) inFlight = without(inFlight, uploadId)
    })
    return run
  }

  return {
    schedule(uploadId, patch) {
      pending = new Map(pending).set(uploadId, { ...pending.get(uploadId), ...patch })
      clearTimer(uploadId)
      timers = new Map(timers).set(
        uploadId,
        window.setTimeout(() => void sendOne(uploadId), delayMs),
      )
    },
    async flush() {
      const ids = new Set([...pending.keys(), ...inFlight.keys()])
      await Promise.all([...ids].map(sendOne))
    },
    cancel(uploadId) {
      clearTimer(uploadId)
      pending = without(pending, uploadId)
    },
  }
}
