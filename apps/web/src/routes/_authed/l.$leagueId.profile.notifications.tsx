import { createFileRoute } from '@tanstack/react-router'
import { ProfileSubPage } from '@/features/profile/components/profile-sub-page'
import { NotificationSettingsSection } from '@/features/push/components/notification-settings-section'

export const Route = createFileRoute('/_authed/l/$leagueId/profile/notifications')({
  component: NotificationsScreen,
})

function NotificationsScreen() {
  const { leagueId } = Route.useParams()

  return (
    <ProfileSubPage leagueId={leagueId} title="Notifications">
      <NotificationSettingsSection />
    </ProfileSubPage>
  )
}
