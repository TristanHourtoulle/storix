import { Outlet, createFileRoute, redirect, useMatchRoute } from '@tanstack/react-router'
import { useRef, useState } from 'react'
import { BottomNav } from '@/components/ui/bottom-nav'
import { PasskeyPrompt } from '@/features/auth/components/passkey-prompt'
import { IosInstallHint } from '@/features/pwa/components/ios-install-hint'
import { meQueryOptions } from '@/features/auth/session.queries'
import { useCollectionVisitTracker } from '@/features/cards/news/use-collection-visit-tracker'
import { EmblemGate } from '@/features/emblems/components/emblem-gate'
import { GoalBannerGate } from '@/features/league-goal/components/goal-banner-gate'
import { MythicBannerGate } from '@/features/league-feed/components/mythic-banner-gate'
import { clearLastLeagueId, useRememberLastLeague } from '@/features/leagues/last-league'
import { purgeLeagueCaches } from '@/features/privacy/purge-cache'
import { useRemovedCardsSync } from '@/features/privacy/use-removed-cards-sync'
import { loadLeagueDetail } from '@/features/leagues/leagues.queries'
import { OnboardingGate } from '@/features/onboarding/components/onboarding-gate'
import { wasOnboardingShown } from '@/features/onboarding/onboarding-session'
import { useOnboarding } from '@/features/onboarding/use-onboarding'
import { usePortraitCachePruning } from '@/features/portraits/use-portrait-cache-pruning'
import { WhatsNewGate } from '@/features/whats-new/components/whats-new-gate'
import { wasAutoShown } from '@/features/whats-new/news-session'
import { useWhatsNew } from '@/features/whats-new/use-whats-new'
import { useHeightVar } from '@/lib/use-height-var'
import { useViewportHeal } from '@/lib/use-viewport-heal'

export const Route = createFileRoute('/_authed/l/$leagueId')({
  loader: async ({ context, params, preload }) => {
    const league = await loadLeagueDetail(context.queryClient, params.leagueId)
    if (league) return
    if (!preload) {
      await purgeLeagueCaches(context.queryClient, params.leagueId)
      context.queryClient.removeQueries({ queryKey: meQueryOptions.queryKey })
      clearLastLeagueId(context.me.user.id)
    }
    throw redirect({ to: '/' })
  },
  component: LeagueLayout,
})

function LeagueLayout() {
  const { leagueId } = Route.useParams()
  const { me } = Route.useRouteContext()
  const matchRoute = useMatchRoute()
  useRememberLastLeague(me.user.id, leagueId)
  useRemovedCardsSync(me.user.id, leagueId)
  usePortraitCachePruning(leagueId)
  const navStackRef = useHeightVar('--nav-stack-h')
  const shellRef = useRef<HTMLDivElement>(null)
  useCollectionVisitTracker(me.user.id, leagueId)
  const { hasUnseen } = useWhatsNew()
  const [isNewsOpen, setIsNewsOpen] = useState(false)
  const [isPasskeyOpen, setIsPasskeyOpen] = useState(false)
  const [isEmblemOpen, setIsEmblemOpen] = useState(false)
  const [isMythicOpen, setIsMythicOpen] = useState(false)
  const [isGoalOpen, setIsGoalOpen] = useState(false)
  const isNewsPending = hasUnseen && !wasAutoShown(me.user.id)
  const onboarding = useOnboarding()
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false)
  const isOnboardingBlocking =
    isOnboardingOpen ||
    onboarding.isPending ||
    (!onboarding.isSeen && !wasOnboardingShown(me.user.id))
  const isBoosterStage = Boolean(matchRoute({ to: '/l/$leagueId/booster', params: { leagueId } }))
  const isAddScreen = Boolean(matchRoute({ to: '/l/$leagueId/add', params: { leagueId } }))
  useViewportHeal(shellRef, '[data-nav-stack]', isBoosterStage || isAddScreen)
  const active = matchRoute({ to: '/l/$leagueId/collection', params: { leagueId } })
    ? 'collection'
    : matchRoute({ to: '/l/$leagueId/add', params: { leagueId } })
      ? 'add'
      : matchRoute({ to: '/l/$leagueId/profile', params: { leagueId }, fuzzy: true }) ||
          matchRoute({ to: '/l/$leagueId/members', params: { leagueId }, fuzzy: true }) ||
          matchRoute({ to: '/l/$leagueId/admin', params: { leagueId } })
        ? 'profile'
        : 'home'

  return (
    <div ref={shellRef} className="flex min-h-dvh flex-col">
      <div className="isolate flex flex-1 flex-col">
        <Outlet />
      </div>
      <OnboardingGate
        leagueId={leagueId}
        userId={me.user.id}
        isSuspended={isBoosterStage || isAddScreen}
        onOpenChange={setIsOnboardingOpen}
      />
      <WhatsNewGate
        leagueId={leagueId}
        userId={me.user.id}
        isSuspended={isBoosterStage || isAddScreen || isOnboardingBlocking}
        onOpenChange={setIsNewsOpen}
      />
      <EmblemGate
        leagueId={leagueId}
        userId={me.user.id}
        isSuspended={
          isBoosterStage || isAddScreen || isOnboardingBlocking || isNewsOpen || isNewsPending
        }
        onOpenChange={setIsEmblemOpen}
      />
      <MythicBannerGate
        leagueId={leagueId}
        isSuspended={
          isBoosterStage ||
          isAddScreen ||
          isOnboardingBlocking ||
          isNewsOpen ||
          isNewsPending ||
          isPasskeyOpen ||
          isEmblemOpen ||
          isGoalOpen
        }
        onOpenChange={setIsMythicOpen}
      />
      <GoalBannerGate
        leagueId={leagueId}
        isSuspended={
          isBoosterStage ||
          isAddScreen ||
          isOnboardingBlocking ||
          isNewsOpen ||
          isNewsPending ||
          isPasskeyOpen ||
          isEmblemOpen ||
          isMythicOpen
        }
        onOpenChange={setIsGoalOpen}
      />
      {isNewsOpen || isNewsPending || isOnboardingBlocking || isMythicOpen || isGoalOpen ? null : (
        <PasskeyPrompt
          userId={me.user.id}
          displayUsername={me.user.displayUsername}
          onOpenChange={setIsPasskeyOpen}
        />
      )}
      {isBoosterStage ? null : (
        <div ref={navStackRef} data-nav-stack className="sticky bottom-0 z-40 mt-auto">
          {isOnboardingBlocking ? null : <IosInstallHint />}
          <BottomNav leagueId={leagueId} active={active} hasProfileBadge={hasUnseen} />
        </div>
      )}
    </div>
  )
}
