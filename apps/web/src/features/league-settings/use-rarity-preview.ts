import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { rarityPreviewBodySchema, type RarityPreview } from '@storix/shared'
import { rarityPreviewQueryOptions, type RarityWeights } from './league-settings.queries'

const DEBOUNCE_MS = 300

interface RarityPreviewState {
  preview: RarityPreview | undefined
  isFetching: boolean
  isError: boolean
}

function useDebouncedWeights(weights: RarityWeights): RarityWeights {
  const [debounced, setDebounced] = useState(weights)
  const { uploaderScarcity, photoAge, reactions } = weights

  useEffect(() => {
    const timer = setTimeout(
      () => setDebounced({ uploaderScarcity, photoAge, reactions }),
      DEBOUNCE_MS,
    )
    return () => clearTimeout(timer)
  }, [uploaderScarcity, photoAge, reactions])

  return debounced
}

/** Debounced tier distribution preview; superseded requests are aborted by the query. */
export function useRarityPreview(leagueId: string, weights: RarityWeights): RarityPreviewState {
  const debounced = useDebouncedWeights(weights)
  const isValid = rarityPreviewBodySchema.safeParse({ rarityWeights: debounced }).success
  const query = useQuery({ ...rarityPreviewQueryOptions(leagueId, debounced), enabled: isValid })

  return {
    preview: isValid ? query.data : undefined,
    isFetching: query.isFetching,
    isError: query.isError,
  }
}
