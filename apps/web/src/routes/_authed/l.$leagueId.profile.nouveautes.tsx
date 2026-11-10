import { groupReleasesByDay, type ReleaseDay, type ReleaseNote } from '@storix/shared'
import { createFileRoute } from '@tanstack/react-router'
import { useCallback, useMemo, useState } from 'react'
import { ProfileSubPage } from '@/features/profile/components/profile-sub-page'
import { NewsPackList } from '@/features/whats-new/components/news-pack-list'
import { NewsStage } from '@/features/whats-new/components/news-stage'
import { newsDeckOf } from '@/features/whats-new/news-deck'
import { useWhatsNew } from '@/features/whats-new/use-whats-new'

export const Route = createFileRoute('/_authed/l/$leagueId/profile/nouveautes')({
  component: WhatsNewScreen,
})

function WhatsNewScreen() {
  const { leagueId } = Route.useParams()
  const { releases, isUnseen, markSeen } = useWhatsNew()
  const days = useMemo(() => groupReleasesByDay(releases), [releases])
  const [openDay, setOpenDay] = useState<ReleaseDay<ReleaseNote> | null>(null)
  const deck = useMemo(() => (openDay ? newsDeckOf(openDay.releases) : null), [openDay])

  const close = useCallback(() => {
    const newest = openDay?.releases[0]
    if (newest !== undefined && openDay?.releases.some((release) => isUnseen(release.id))) {
      markSeen(newest.id)
    }
    setOpenDay(null)
  }, [isUnseen, markSeen, openDay])

  return (
    <ProfileSubPage leagueId={leagueId} title="Quoi de neuf">
      <NewsPackList days={days} isUnseen={isUnseen} onOpen={setOpenDay} />
      {deck ? <NewsStage leagueId={leagueId} deck={deck} mode="replay" onClose={close} /> : null}
    </ProfileSubPage>
  )
}
