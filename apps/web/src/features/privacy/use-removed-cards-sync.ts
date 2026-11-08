import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import type { RemovedCard } from '@storix/shared'
import { ApiError } from '@/lib/http'
import { logger } from '@/lib/logger'
import { STORAGE_KEYS, readStorage, writeStorage } from '@/lib/storage'
import { clearLastLeagueId } from '@/features/leagues/last-league'
import { playSound } from '@/features/sound/sound'
import { fetchRemovedCards } from './removals.api'
import { purgeLeagueCaches, purgeRemovedCards } from './purge-cache'

const MAX_PAGES = 50
const MAX_ACKNOWLEDGED = 200

interface PendingRemoval {
  cardId: string
  compensation: number
}

interface RemovalNoticeState {
  count: number
  dust: number
}

function isPendingRemoval(value: unknown): value is PendingRemoval {
  return (
    typeof value === 'object' &&
    value !== null &&
    'cardId' in value &&
    typeof value.cardId === 'string' &&
    'compensation' in value &&
    typeof value.compensation === 'number'
  )
}

function readJsonList<T>(key: string, guard: (value: unknown) => value is T): T[] {
  const raw = readStorage(key)
  if (raw === null) return []
  try {
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(guard) : []
  } catch (error) {
    logger.warn('Stored list unreadable', { key, error })
    return []
  }
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isMissingLeagueError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 403 || error.status === 404)
}

/** Syncs cards removed from a league, purges their cached media and exposes a compensation notice. */
export function useRemovedCardsSync(
  userId: string,
  leagueId: string,
): { notice: RemovalNoticeState | null; acknowledge: () => void } {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [version, setVersion] = useState(0)
  const pendingKey = STORAGE_KEYS.pendingRemovals(userId, leagueId)
  const acknowledgedKey = STORAGE_KEYS.acknowledgedRemovals(userId, leagueId)

  const { data, error } = useQuery({
    queryKey: ['leagues', leagueId, 'removed-cards'],
    refetchOnWindowFocus: true,
    staleTime: 60_000,
    retry: (failureCount, caught) => !isMissingLeagueError(caught) && failureCount < 3,
    queryFn: async (): Promise<{ syncedAt: number }> => {
      const cursorKey = STORAGE_KEYS.removalCursor(userId, leagueId)
      let since = readStorage(cursorKey) ?? undefined
      let after: string | undefined
      const fresh: RemovedCard[] = []
      let isComplete = false
      for (let page = 0; page < MAX_PAGES; page += 1) {
        const response = await fetchRemovedCards(leagueId, { since, after })
        fresh.push(...response.removed)
        since = response.cursor
        after = response.after ?? undefined
        if (!response.hasMore) {
          isComplete = true
          break
        }
      }
      if (!isComplete) logger.warn('Removed cards sync hit the page limit', { leagueId })
      if (fresh.length > 0) {
        const acknowledged = new Set(readJsonList(acknowledgedKey, isString))
        const pending = readJsonList(pendingKey, isPendingRemoval)
        const known = new Set(pending.map((entry) => entry.cardId))
        const added = fresh.filter(
          (card) =>
            card.compensation > 0 && !known.has(card.cardId) && !acknowledged.has(card.cardId),
        )
        writeStorage(
          pendingKey,
          JSON.stringify([
            ...pending,
            ...added.map((card) => ({ cardId: card.cardId, compensation: card.compensation })),
          ]),
        )
        if (added.length > 0) playSound({ name: 'cardRemoved' })
        const isPurged = await purgeRemovedCards(
          fresh.map((card) => card.mediaPrefix),
          leagueId,
        )
        for (const card of fresh) {
          queryClient.removeQueries({
            queryKey: ['leagues', leagueId, 'cards', 'detail', card.cardId],
          })
        }
        for (const segment of ['cards', 'wallet', 'reveals', 'admin']) {
          void queryClient.invalidateQueries({ queryKey: ['leagues', leagueId, segment] })
        }
        if (!isPurged) {
          logger.warn('Removed cards purge incomplete, cursor kept for retry', { leagueId })
          return { syncedAt: Date.now() }
        }
      }
      if (since !== undefined) writeStorage(cursorKey, since)
      return { syncedAt: Date.now() }
    },
  })

  useEffect(() => {
    if (!isMissingLeagueError(error)) return
    clearLastLeagueId(userId)
    void purgeLeagueCaches(queryClient, leagueId).then(() => navigate({ to: '/', replace: true }))
  }, [error, userId, leagueId, queryClient, navigate])

  const notice = useMemo((): RemovalNoticeState | null => {
    void data
    void version
    const acknowledged = new Set(readJsonList(acknowledgedKey, isString))
    const pending = readJsonList(pendingKey, isPendingRemoval).filter(
      (entry) => !acknowledged.has(entry.cardId),
    )
    if (pending.length === 0) return null
    return {
      count: pending.length,
      dust: pending.reduce((total, entry) => total + entry.compensation, 0),
    }
  }, [data, version, pendingKey, acknowledgedKey])

  const acknowledge = useCallback((): void => {
    const pending = readJsonList(pendingKey, isPendingRemoval)
    const acknowledged = readJsonList(acknowledgedKey, isString)
    const next = [...new Set([...acknowledged, ...pending.map((entry) => entry.cardId)])]
    writeStorage(acknowledgedKey, JSON.stringify(next.slice(-MAX_ACKNOWLEDGED)))
    writeStorage(pendingKey, JSON.stringify([]))
    setVersion((current) => current + 1)
  }, [pendingKey, acknowledgedKey])

  return { notice, acknowledge }
}
