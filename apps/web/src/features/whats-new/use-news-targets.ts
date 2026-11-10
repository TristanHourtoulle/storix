import { useQuery } from '@tanstack/react-query'
import type { NewsTryTarget, WhatsNewTargets } from '@storix/shared'
import { useCallback } from 'react'
import { whatsNewTargetsQueryOptions } from './whats-new.queries'

export type NewsTryLink =
  | { to: '/l/$leagueId/add'; params: { leagueId: string } }
  | {
      to: '/l/$leagueId/collection'
      params: { leagueId: string }
      search: { sort: 'discovery' }
    }
  | { to: '/l/$leagueId/cards/$cardId'; params: { leagueId: string; cardId: string } }

interface NewsTargets {
  hrefFor: (target: NewsTryTarget) => NewsTryLink | null
}

function cardLink(leagueId: string, cardId: string | null): NewsTryLink | null {
  return cardId === null ? null : { to: '/l/$leagueId/cards/$cardId', params: { leagueId, cardId } }
}

function linkFor(
  leagueId: string,
  target: NewsTryTarget,
  targets: WhatsNewTargets,
): NewsTryLink | null {
  switch (target) {
    case 'add':
      return { to: '/l/$leagueId/add', params: { leagueId } }
    case 'collection-discovery':
      return targets.showcaseCardId === null
        ? null
        : { to: '/l/$leagueId/collection', params: { leagueId }, search: { sort: 'discovery' } }
    case 'showcase-card':
      return cardLink(leagueId, targets.showcaseCardId)
    case 'stack-card':
      return cardLink(leagueId, targets.stackCardId)
    case 'none':
      return null
  }
}

/** Resolves each "Essayer" target to link props, or null while loading, failed or empty. */
export function useNewsTargets(leagueId: string, isEnabled: boolean): NewsTargets {
  const { data } = useQuery({ ...whatsNewTargetsQueryOptions(leagueId), enabled: isEnabled })
  const hrefFor = useCallback(
    (target: NewsTryTarget) => (data ? linkFor(leagueId, target, data) : null),
    [data, leagueId],
  )
  return { hrefFor }
}
