import { createFileRoute } from '@tanstack/react-router'
import { BoosterHistoryList } from '@/features/booster-history/components/booster-history-list'
import { useMyLeagues } from '@/features/leagues/use-my-leagues'
import { ProfileSubPage } from '@/features/profile/components/profile-sub-page'

export const Route = createFileRoute('/_authed/l/$leagueId/profile/boosters')({
  component: BoosterHistoryScreen,
})

function BoosterHistoryScreen() {
  const { leagueId } = Route.useParams()
  const leagueName = useMyLeagues().find((league) => league.id === leagueId)?.name

  return (
    <ProfileSubPage leagueId={leagueId} title="Mes boosters" subtitle={leagueName}>
      <BoosterHistoryList leagueId={leagueId} />
    </ProfileSubPage>
  )
}
