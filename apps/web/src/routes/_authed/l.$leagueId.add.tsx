import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import type { SeriesSummary, UploadDraft } from '@storix/shared'
import { useMembers } from '@/features/members/use-members'
import { membersQueryOptions } from '@/features/members/members.queries'
import { CameraStart } from '@/features/uploads/camera/camera-start'
import { LeaveDialog } from '@/features/uploads/components/leave-dialog'
import { PublishDone } from '@/features/uploads/components/publish-done'
import { UploadSummary } from '@/features/uploads/components/upload-summary'
import { draftCapacityOf } from '@/features/uploads/draft-capacity'
import { useUploadSession } from '@/features/uploads/session/use-upload-session'
import { CardStack } from '@/features/uploads/stack/card-stack'
import { draftsQueryOptions, useDrafts } from '@/features/uploads/use-drafts'
import { useLeaveGuard } from '@/features/uploads/use-leave-guard'
import { usePublish } from '@/features/uploads/use-publish'
import { isSeriesOpen } from '@/features/series/series-copy'
import { eventsQueryOptions, themeCardQueryOptions } from '@/features/series/series.queries'
import { useEventPrecheck } from '@/features/series/use-event-precheck'
import { uploadQuotaQueryOptions, useUploadQuota } from '@/features/uploads/use-upload-quota'

export const Route = createFileRoute('/_authed/l/$leagueId/add')({
  validateSearch: z.object({
    resume: z.boolean().optional(),
    theme: z.uuid().optional(),
    series: z.uuid().optional(),
  }),
  remountDeps: ({ params }) => params.leagueId,
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(membersQueryOptions(params.leagueId)),
      context.queryClient.ensureQueryData(uploadQuotaQueryOptions(params.leagueId)),
      context.queryClient
        .ensureQueryData(themeCardQueryOptions(params.leagueId))
        .catch(() => undefined),
      context.queryClient
        .ensureQueryData(eventsQueryOptions(params.leagueId))
        .catch(() => undefined),
      context.queryClient
        .ensureQueryData(draftsQueryOptions(params.leagueId))
        .catch(() => undefined),
    ]),
  component: AddPhotos,
})

const NO_DRAFTS: UploadDraft[] = []
const NO_SERIES: SeriesSummary[] = []

function AddPhotos() {
  const { leagueId } = Route.useParams()
  const { resume, theme, series: seriesParam } = Route.useSearch()
  const themeSeries = useQuery(themeCardQueryOptions(leagueId)).data?.series
  const eventsQuery = useQuery(eventsQueryOptions(leagueId))
  const events = eventsQuery.data
  const openSeries = useMemo<readonly SeriesSummary[]>(() => {
    const open = [
      ...(themeSeries !== undefined && isSeriesOpen(themeSeries) ? [themeSeries] : []),
      ...(events?.live ?? []),
      ...(events?.grace ?? []),
    ]
    return open.length === 0 ? NO_SERIES : open
  }, [themeSeries, events])
  const [defaultSeriesIds] = useState<readonly string[]>(() =>
    openSeries
      .filter((series) => series.id === theme || series.id === seriesParam)
      .map((series) => series.id),
  )
  const navigate = useNavigate({ from: Route.fullPath })
  const quota = useUploadQuota(leagueId)
  const members = useMembers(leagueId)
  const draftsQuery = useDrafts(leagueId)
  const drafts = draftsQuery.data ?? NO_DRAFTS
  const hasDrafts = draftsQuery.isSuccess
  const session = useUploadSession(leagueId, draftCapacityOf(quota), defaultSeriesIds)
  const { publish, isPublishing, progress } = usePublish(leagueId, session)
  const leave = useLeaveGuard(leagueId, session, drafts)
  const { state, stats, resume: resumeDrafts, dispatch, goTo } = session
  useEventPrecheck(state.cards, openSeries, dispatch, !eventsQuery.isPending)

  useEffect(() => {
    if (!resume || !hasDrafts) return
    if (drafts.length > 0) resumeDrafts([...drafts])
    void navigate({ search: {}, replace: true })
  }, [resume, hasDrafts, drafts, resumeDrafts, navigate])

  const close = (): void => void navigate({ to: '/l/$leagueId/collection', params: { leagueId } })

  const leaveDialog = (
    <LeaveDialog
      open={leave.isOpen}
      sent={stats.sent}
      unsent={stats.unsent}
      onKeep={leave.keep}
      onStay={leave.stay}
      onDiscardAll={leave.discardAll}
    />
  )

  if (state.screen === 'done') {
    return (
      <PublishDone
        leagueId={leagueId}
        count={state.published?.count ?? 0}
        duplicates={state.published?.duplicates ?? 0}
        notice={state.notice}
      />
    )
  }

  if (state.screen === 'summary' || state.screen === 'publishing') {
    return (
      <>
        <UploadSummary
          cards={state.cards}
          counts={{
            publishable: stats.publishable.length,
            missingTitles: stats.missingTitles,
            busy: stats.busy,
            duplicates: stats.duplicates,
            errors: stats.errors,
          }}
          notice={state.notice}
          isPublishing={isPublishing || state.screen === 'publishing'}
          progress={progress}
          onBack={() => dispatch({ type: 'screen', screen: 'stack' })}
          onClose={close}
          onSelect={goTo}
          onPublish={() => void publish()}
        />
        {leaveDialog}
      </>
    )
  }

  if (state.screen === 'stack' && state.cards.length > 0) {
    return (
      <>
        <CardStack
          session={session}
          members={members}
          openSeries={openSeries}
          onClose={close}
          onOverlayChange={leave.setOverlayCloser}
        />
        {leaveDialog}
      </>
    )
  }

  return <CameraStart leagueId={leagueId} session={session} drafts={drafts} />
}
