import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { DisplayNameSection } from '@/features/account/components/display-name-section'
import { meQueryOptions } from '@/features/auth/session.queries'
import { ProfileSubPage } from '@/features/profile/components/profile-sub-page'

export const Route = createFileRoute('/_authed/l/$leagueId/profile/pseudo')({
  component: DisplayNameScreen,
})

function DisplayNameScreen() {
  const { leagueId } = Route.useParams()
  const { data: me } = useSuspenseQuery(meQueryOptions)

  return (
    <ProfileSubPage leagueId={leagueId} title="Pseudo affiché">
      {me ? (
        <DisplayNameSection displayName={me.user.displayUsername} username={me.user.username} />
      ) : null}
    </ProfileSubPage>
  )
}
