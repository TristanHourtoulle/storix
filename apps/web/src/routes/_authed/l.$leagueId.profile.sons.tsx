import { createFileRoute } from '@tanstack/react-router'
import { ProfileSubPage } from '@/features/profile/components/profile-sub-page'
import { SoundSettingsSection } from '@/features/sound/components/sound-settings-section'

export const Route = createFileRoute('/_authed/l/$leagueId/profile/sons')({
  component: SoundsScreen,
})

function SoundsScreen() {
  const { leagueId } = Route.useParams()

  return (
    <ProfileSubPage leagueId={leagueId} title="Sons">
      <SoundSettingsSection />
    </ProfileSubPage>
  )
}
