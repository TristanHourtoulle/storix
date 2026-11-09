import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { logger } from '@/lib/logger'
import { nextLocalId } from '../session/session-fields'
import { createShotThumbnail } from './shot-thumbnail'

export interface Shot {
  id: string
  file: File
  thumbUrl: string | null
  hasThumbFailed: boolean
}

export interface ShotStrip {
  shots: readonly Shot[]
  add(files: readonly File[]): void
  remove(id: string): void
  files(): File[]
  drain(): Promise<void>
}

function patchShot(shots: readonly Shot[], id: string, patch: Partial<Shot>): readonly Shot[] {
  return shots.map((shot) => (shot.id === id ? { ...shot, ...patch } : shot))
}

/** Local, not-yet-uploaded shots of the camera start screen, with their thumbnails. */
export function useShotStrip(): ShotStrip {
  const [shots, setShots] = useState<readonly Shot[]>([])
  const isMountedRef = useRef(false)
  const urlsRef = useRef<ReadonlyMap<string, string>>(new Map())
  const removedRef = useRef<ReadonlySet<string>>(new Set())
  const queueRef = useRef<Promise<void>>(Promise.resolve())
  const isDrainedRef = useRef(false)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url))
      urlsRef.current = new Map()
    }
  }, [])

  const isGone = useCallback(
    (id: string): boolean =>
      !isMountedRef.current || isDrainedRef.current || removedRef.current.has(id),
    [],
  )

  const makeThumbnail = useCallback(
    async (shot: Shot): Promise<void> => {
      if (isGone(shot.id)) return
      try {
        const url = await createShotThumbnail(shot.file)
        if (isGone(shot.id)) {
          URL.revokeObjectURL(url)
          return
        }
        urlsRef.current = new Map([...urlsRef.current, [shot.id, url]])
        setShots((current) => patchShot(current, shot.id, { thumbUrl: url }))
      } catch (error) {
        logger.warn('Shot thumbnail failed', {
          name: error instanceof Error ? error.name : 'UnknownError',
        })
        if (!isGone(shot.id)) {
          setShots((current) => patchShot(current, shot.id, { hasThumbFailed: true }))
        }
      }
    },
    [isGone],
  )

  const add = useCallback(
    (files: readonly File[]): void => {
      const added = files.map<Shot>((file) => ({
        id: nextLocalId(),
        file,
        thumbUrl: null,
        hasThumbFailed: false,
      }))
      if (added.length === 0) return
      setShots((current) => [...current, ...added])
      queueRef.current = added.reduce(
        (queue, shot) => queue.then(() => makeThumbnail(shot)),
        queueRef.current,
      )
    },
    [makeThumbnail],
  )

  const remove = useCallback((id: string): void => {
    removedRef.current = new Set([...removedRef.current, id])
    const url = urlsRef.current.get(id)
    if (url) {
      URL.revokeObjectURL(url)
      urlsRef.current = new Map([...urlsRef.current].filter(([shotId]) => shotId !== id))
    }
    setShots((current) => current.filter((shot) => shot.id !== id))
  }, [])

  const files = useCallback((): File[] => shots.map((shot) => shot.file), [shots])

  const drain = useCallback((): Promise<void> => {
    isDrainedRef.current = true
    return queueRef.current
  }, [])

  return useMemo(() => ({ shots, add, remove, files, drain }), [shots, add, remove, files, drain])
}
