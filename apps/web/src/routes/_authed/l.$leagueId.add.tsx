import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import type { UploadDraft } from '@storix/shared'
import { EmptyState } from '@/components/ui/empty-state'
import { Notice } from '@/components/ui/notice'
import { TopBar } from '@/components/ui/top-bar'
import { useMembers } from '@/features/members/use-members'
import { membersQueryOptions } from '@/features/members/members.queries'
import { DraftBanner } from '@/features/uploads/components/draft-banner'
import { LeaveDialog } from '@/features/uploads/components/leave-dialog'
import { PhotoPicker } from '@/features/uploads/components/photo-picker'
import { PublishDone } from '@/features/uploads/components/publish-done'
import { UploadSummary } from '@/features/uploads/components/upload-summary'
import { draftCapacityOf } from '@/features/uploads/draft-capacity'
import { useUploadSession, type UploadSession } from '@/features/uploads/session/use-upload-session'
import { CardStack } from '@/features/uploads/stack/card-stack'
import { overflowMessage, plural } from '@/features/uploads/upload-copy'
import { draftsQueryOptions, useDrafts } from '@/features/uploads/use-drafts'
import { useLeaveGuard } from '@/features/uploads/use-leave-guard'
import { usePublish } from '@/features/uploads/use-publish'
import { uploadQuotaQueryOptions, useUploadQuota } from '@/features/uploads/use-upload-quota'

export const Route = createFileRoute('/_authed/l/$leagueId/add')({
  validateSearch: z.object({ resume: z.boolean().optional() }),
  remountDeps: ({ params }) => params.leagueId,
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(membersQueryOptions(params.leagueId)),
      context.queryClient.ensureQueryData(uploadQuotaQueryOptions(params.leagueId)),
      context.queryClient
        .ensureQueryData(draftsQueryOptions(params.leagueId))
        .catch(() => undefined),
    ]),
  component: AddPhotos,
})

const NO_DRAFTS: UploadDraft[] = []

interface StartScreenProps {
  leagueId: string
  session: UploadSession
  drafts: readonly UploadDraft[]
}

function StartScreen({ leagueId, session, drafts }: StartScreenProps) {
  const quota = useUploadQuota(leagueId)
  const { overflow, cards } = session.state

  const handlePick = (files: File[]): void => {
    const shouldResume = cards.length === 0 && drafts.length > 0
    if (shouldResume) session.resume([...drafts])
    const stacked = shouldResume && quota.unlimited ? drafts.length : 0
    void session.add(files, stacked)
  }

  return (
    <main className="screen">
      <TopBar title="Nouvelles cartes" />
      {overflow ? <Notice tone="info">{overflowMessage(overflow)}</Notice> : null}
      <DraftBanner leagueId={leagueId} />
      {quota.remaining === 0 ? (
        <EmptyState
          icon="plus"
          title="Limite atteinte"
          body="Tu pourras ajouter d'autres photos demain."
        />
      ) : (
        <>
          <p className="m-0 text-[13px] text-muted">
            {quota.unlimited
              ? 'Admin · uploads illimités'
              : `Il te reste ${plural(quota.remaining, 'photo', 'photos')} aujourd'hui`}
          </p>
          <PhotoPicker variant="button" onPick={handlePick} />
        </>
      )}
    </main>
  )
}

function AddPhotos() {
  const { leagueId } = Route.useParams()
  const { resume } = Route.useSearch()
  const navigate = useNavigate({ from: Route.fullPath })
  const quota = useUploadQuota(leagueId)
  const members = useMembers(leagueId)
  const draftsQuery = useDrafts(leagueId)
  const drafts = draftsQuery.data ?? NO_DRAFTS
  const hasDrafts = draftsQuery.isSuccess
  const session = useUploadSession(leagueId, draftCapacityOf(quota))
  const { publish, isPublishing, progress } = usePublish(leagueId, session)
  const leave = useLeaveGuard(leagueId, session, drafts)
  const { state, stats, resume: resumeDrafts, dispatch, goTo } = session

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
          onClose={close}
          onOverlayChange={leave.setOverlayCloser}
        />
        {leaveDialog}
      </>
    )
  }

  return <StartScreen leagueId={leagueId} session={session} drafts={drafts} />
}
