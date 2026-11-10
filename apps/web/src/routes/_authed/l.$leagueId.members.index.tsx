import { createFileRoute } from '@tanstack/react-router'
import { useMyLeagues } from '@/features/leagues/use-my-leagues'
import { MemberDirectory } from '@/features/members/components/member-directory'
import { ProfileSubPage } from '@/features/profile/components/profile-sub-page'

export const Route = createFileRoute('/_authed/l/$leagueId/members/')({
  component: MembersScreen,
})

function MembersScreen() {
  const { leagueId } = Route.useParams()
  const leagueName = useMyLeagues().find((league) => league.id === leagueId)?.name

  return (
    <ProfileSubPage leagueId={leagueId} title="Membres" subtitle={leagueName}>
      <MemberDirectory leagueId={leagueId} />
    </ProfileSubPage>
  )
}
