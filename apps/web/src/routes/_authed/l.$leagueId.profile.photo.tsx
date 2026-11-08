import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { meQueryOptions } from '@/features/auth/session.queries'
import { PortraitEditor } from '@/features/portraits/components/portrait-editor'
import { ProfileSubPage } from '@/features/profile/components/profile-sub-page'

export const Route = createFileRoute('/_authed/l/$leagueId/profile/photo')({
  component: ProfilePhotoScreen,
})

const AVATAR_TARGET = { kind: 'avatar' } as const

function ProfilePhotoScreen() {
  const { leagueId } = Route.useParams()
  const { data: me } = useSuspenseQuery(meQueryOptions)

  return (
    <ProfileSubPage leagueId={leagueId} title="Photo de profil">
      {me ? (
        <PortraitEditor
          target={AVATAR_TARGET}
          current={me.avatar}
          fallbackLabel={me.user.displayUsername}
          shape="circle"
          cropSubtitle="Photo de profil"
          removeTitle="Retirer ta photo de profil ?"
          removeBody="Les membres de tes ligues verront tes initiales."
        />
      ) : null}
    </ProfileSubPage>
  )
}
