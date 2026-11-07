import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { ChangePasswordForm } from '@/features/auth/components/change-password-form'
import { PasskeyList } from '@/features/auth/components/passkey-list'
import { meQueryOptions } from '@/features/auth/session.queries'
import { ProfileSubPage } from '@/features/profile/components/profile-sub-page'

export const Route = createFileRoute('/_authed/l/$leagueId/profile/connexion')({
  component: SignInScreen,
})

function SignInScreen() {
  const { leagueId } = Route.useParams()
  const { data: me } = useSuspenseQuery(meQueryOptions)

  return (
    <ProfileSubPage leagueId={leagueId} title="Connexion">
      <div className="flex flex-col gap-8">
        {me ? <PasskeyList displayUsername={me.user.displayUsername} /> : null}
        <ChangePasswordForm />
      </div>
    </ProfileSubPage>
  )
}
