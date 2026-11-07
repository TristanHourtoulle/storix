import { createFileRoute } from '@tanstack/react-router'
import { LeagueList } from '@/features/leagues/components/league-list'
import { useMyLeagues } from '@/features/leagues/use-my-leagues'
import { ProfileSubPage } from '@/features/profile/components/profile-sub-page'

export const Route = createFileRoute('/_authed/l/$leagueId/profile/ligues')({
  component: MyLeaguesScreen,
})

function MyLeaguesScreen() {
  const { leagueId } = Route.useParams()
  const leagues = useMyLeagues()

  return (
    <ProfileSubPage leagueId={leagueId} title="Mes ligues">
      <LeagueList leagues={leagues} currentLeagueId={leagueId} />
    </ProfileSubPage>
  )
}
