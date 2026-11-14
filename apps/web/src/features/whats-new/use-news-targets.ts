import { useQuery } from '@tanstack/react-query'
import type { NewsTryTarget, WhatsNewTargets } from '@storix/shared'
import { useCallback } from 'react'
import { useRouteContext } from '@tanstack/react-router'
import { whatsNewTargetsQueryOptions } from './whats-new.queries'

export type NewsTryLink =
  | { to: '/l/$leagueId/add'; params: { leagueId: string } }
  | { to: '/l/$leagueId'; params: { leagueId: string } }
  | {
      to: '/l/$leagueId/collection'
      params: { leagueId: string }
      search: { sort: 'discovery' }
    }
  | {
      to: '/l/$leagueId/collection'
      params: { leagueId: string }
      search: { upgradable: true }
    }
  | {
      to: '/l/$leagueId/collection'
      params: { leagueId: string }
      search: { sort: 'reactions' }
    }
  | { to: '/l/$leagueId/profile/boosters'; params: { leagueId: string } }
  | { to: '/l/$leagueId/members'; params: { leagueId: string } }
  | { to: '/l/$leagueId/tagged'; params: { leagueId: string } }
  | {
      to: '/l/$leagueId/members/$userId'
      params: { leagueId: string; userId: string }
      search: { tab: 'emblems' }
    }
  | { to: '/l/$leagueId/cards/$cardId'; params: { leagueId: string; cardId: string } }
  | { to: '/l/$leagueId/shop'; params: { leagueId: string } }
  | { to: '/l/$leagueId/shop'; params: { leagueId: string }; search: { family: 'bonus' } }
  | { to: '/l/$leagueId/profile/style'; params: { leagueId: string } }
  | { to: '/l/$leagueId/league'; params: { leagueId: string } }

interface NewsTargets {
  hrefFor: (target: NewsTryTarget) => NewsTryLink | null
}

function cardLink(leagueId: string, cardId: string | null): NewsTryLink | null {
  return cardId === null ? null : { to: '/l/$leagueId/cards/$cardId', params: { leagueId, cardId } }
}

function linkFor(
  leagueId: string,
  viewerId: string,
  target: NewsTryTarget,
  targets: WhatsNewTargets,
): NewsTryLink | null {
  switch (target) {
    case 'add':
      return { to: '/l/$leagueId/add', params: { leagueId } }
    case 'home':
      return { to: '/l/$leagueId', params: { leagueId } }
    case 'collection-discovery':
      return targets.showcaseCardId === null
        ? null
        : { to: '/l/$leagueId/collection', params: { leagueId }, search: { sort: 'discovery' } }
    case 'collection-upgradable':
      return targets.stackCardId === null
        ? null
        : { to: '/l/$leagueId/collection', params: { leagueId }, search: { upgradable: true } }
    case 'collection-reactions':
      return targets.showcaseCardId === null
        ? null
        : { to: '/l/$leagueId/collection', params: { leagueId }, search: { sort: 'reactions' } }
    case 'booster-history':
      return { to: '/l/$leagueId/profile/boosters', params: { leagueId } }
    case 'members':
      return { to: '/l/$leagueId/members', params: { leagueId } }
    case 'tagged':
      return { to: '/l/$leagueId/tagged', params: { leagueId } }
    case 'emblems':
      return {
        to: '/l/$leagueId/members/$userId',
        params: { leagueId, userId: viewerId },
        search: { tab: 'emblems' },
      }
    case 'showcase-card':
      return cardLink(leagueId, targets.showcaseCardId)
    case 'stack-card':
      return cardLink(leagueId, targets.stackCardId)
    case 'shop':
      return { to: '/l/$leagueId/shop', params: { leagueId } }
    case 'shop-bonus':
      return { to: '/l/$leagueId/shop', params: { leagueId }, search: { family: 'bonus' } }
    case 'style':
      return { to: '/l/$leagueId/profile/style', params: { leagueId } }
    case 'league':
      return { to: '/l/$leagueId/league', params: { leagueId } }
    case 'none':
      return null
  }
}

/** Resolves each "Essayer" target to link props, or null while loading, failed or empty. */
export function useNewsTargets(leagueId: string, isEnabled: boolean): NewsTargets {
  const { me } = useRouteContext({ from: '/_authed' })
  const viewerId = me.user.id
  const { data } = useQuery({ ...whatsNewTargetsQueryOptions(leagueId), enabled: isEnabled })
  const hrefFor = useCallback(
    (target: NewsTryTarget) => (data ? linkFor(leagueId, viewerId, target, data) : null),
    [data, leagueId, viewerId],
  )
  return { hrefFor }
}
