import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { useMyLeagues } from '@/features/leagues/use-my-leagues'
import { EmblemGrid } from '@/features/emblems/components/emblem-grid'
import { MemberPage } from '@/features/members/components/member-page'
import { MEMBER_TABS, type MemberTab } from '@/features/members/components/member-tabs'
import { useMemberProfile } from '@/features/members/use-member-profile'
import { useMemberVisit } from '@/features/missions/use-member-visit'
import { ProfileSubPage } from '@/features/profile/components/profile-sub-page'

export const Route = createFileRoute('/_authed/l/$leagueId/members/$userId')({
  validateSearch: z.object({ tab: z.enum(MEMBER_TABS).optional() }),
  component: MemberScreen,
})

function MemberScreen() {
  const { leagueId, userId } = Route.useParams()
  const { tab = 'photos' } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const leagueName = useMyLeagues().find((league) => league.id === leagueId)?.name
  const profile = useMemberProfile(leagueId, userId)
  useMemberVisit(leagueId, userId, profile.data?.header.isSelf === false)

  function selectTab(next: MemberTab) {
    void navigate({ search: { tab: next === 'photos' ? undefined : next }, replace: true })
  }

  return (
    <ProfileSubPage
      leagueId={leagueId}
      title={profile.data?.header.displayUsername ?? 'Membre'}
      subtitle={leagueName}
      backLabel="Retour"
    >
      {profile.data ? (
        <MemberPage
          leagueId={leagueId}
          profile={profile.data}
          tab={tab}
          onTabChange={selectTab}
          emblems={
            <EmblemGrid leagueId={leagueId} userId={userId} isSelf={profile.data.header.isSelf} />
          }
        />
      ) : profile.isGone ? (
        <EmptyState
          icon="profile"
          title="Membre introuvable"
          body="Cette personne ne fait plus partie de la ligue."
        />
      ) : profile.isError ? (
        <EmptyState
          icon="profile"
          title="Chargement impossible"
          body="Vérifie ta connexion puis réessaie."
          action={
            <Button variant="ghost" onClick={() => void profile.refetch()}>
              Réessayer
            </Button>
          }
        />
      ) : (
        <p className="m-0 text-sm text-muted">Chargement…</p>
      )}
    </ProfileSubPage>
  )
}
