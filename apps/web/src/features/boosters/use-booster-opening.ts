import { useEffect } from 'react'
import { useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query'
import type { BoosterOpening, ErrorCode } from '@storix/shared'
import { ApiError } from '@/lib/http'
import { boosterOpeningQueryOptions, walletQueryOptions } from '../game/game.queries'

/** Extracts the API error code of a failed opening, if any. */
export function getOpeningErrorCode(error: unknown): ErrorCode | null {
  return error instanceof ApiError ? error.code : null
}

/**
 * Opens a booster for a request id. The id lives in the URL so a reload or retry returns the same cards.
 * On success the wallet cache is replaced and the collection and reveals are invalidated.
 */
export function useBoosterOpening(
  leagueId: string,
  requestId: string,
): UseQueryResult<BoosterOpening> {
  const queryClient = useQueryClient()
  const query = useQuery(boosterOpeningQueryOptions(leagueId, requestId))
  const wallet = query.isFetchedAfterMount ? query.data?.wallet : undefined
  const openingId = query.data?.id
  const errorCode = getOpeningErrorCode(query.error)

  useEffect(() => {
    if (!wallet) return
    queryClient.setQueryData(walletQueryOptions(leagueId).queryKey, wallet)
    void queryClient.invalidateQueries({ queryKey: ['leagues', leagueId, 'cards'] })
    void queryClient.invalidateQueries({ queryKey: ['leagues', leagueId, 'reveals'] })
  }, [queryClient, leagueId, openingId, wallet])

  useEffect(() => {
    if (errorCode !== 'BOOSTER_STOCK_EMPTY' && errorCode !== 'BOOSTER_POOL_EMPTY') return
    void queryClient.invalidateQueries({ queryKey: walletQueryOptions(leagueId).queryKey })
  }, [queryClient, leagueId, errorCode])

  return query
}
