import type { ReleaseNote } from '@storix/shared'
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
  const [openRelease, setOpenRelease] = useState<ReleaseNote | null>(null)
  const deck = useMemo(() => (openRelease ? newsDeckOf([openRelease]) : null), [openRelease])

  const close = useCallback(() => {
    if (openRelease !== null && isUnseen(openRelease.id)) markSeen(openRelease.id)
    setOpenRelease(null)
  }, [isUnseen, markSeen, openRelease])

  return (
    <ProfileSubPage leagueId={leagueId} title="Quoi de neuf">
      <NewsPackList releases={releases} isUnseen={isUnseen} onOpen={setOpenRelease} />
      {deck ? <NewsStage leagueId={leagueId} deck={deck} mode="replay" onClose={close} /> : null}
    </ProfileSubPage>
  )
}
