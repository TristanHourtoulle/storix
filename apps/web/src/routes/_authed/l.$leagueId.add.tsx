import { Link, createFileRoute } from '@tanstack/react-router'
import { Button, buttonClassName } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Notice } from '@/components/ui/notice'
import { TopBar } from '@/components/ui/top-bar'
import { useMembers } from '@/features/members/use-members'
import { membersQueryOptions } from '@/features/members/members.queries'
import { CloseUploadButton } from '@/features/uploads/components/close-upload-button'
import { DraftEditor } from '@/features/uploads/components/draft-editor'
import { DraftThumbs } from '@/features/uploads/components/draft-thumbs'
import { PhotoPicker } from '@/features/uploads/components/photo-picker'
import { isSendable, useCreateCards } from '@/features/uploads/use-create-cards'
import {
  countQueuedDrafts,
  draftCapacityOf,
  UNLIMITED_BATCH_SIZE,
  usePhotoDrafts,
  type DraftOverflow,
  type PhotoDraft,
} from '@/features/uploads/use-photo-drafts'
import { uploadQuotaQueryOptions, useUploadQuota } from '@/features/uploads/use-upload-quota'

export const Route = createFileRoute('/_authed/l/$leagueId/add')({
  loader: ({ context, params }) =>
    Promise.all([
      context.queryClient.ensureQueryData(membersQueryOptions(params.leagueId)),
      context.queryClient.ensureQueryData(uploadQuotaQueryOptions(params.leagueId)),
    ]),
  component: AddPhotos,
})

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count > 1 ? pluralForm : singular}`
}

function overflowMessage({ kind, skipped, accepted }: DraftOverflow): string {
  const ignored = `${plural(skipped, "photo n'a", "photos n'ont")} pas été ajoutée${skipped > 1 ? 's' : ''}`
  if (kind === 'batch') return `${UNLIMITED_BATCH_SIZE} photos max par envoi : ${ignored}.`
  return accepted === 0
    ? `Limite du jour atteinte : ${ignored}.`
    : `Il ne te restait ${accepted === 1 ? "qu'une photo" : `que ${accepted} photos`} aujourd'hui, ${ignored}.`
}

function summary(drafts: readonly PhotoDraft[]): string {
  const created = drafts.filter((draft) => draft.phase === 'created').length
  const duplicates = drafts.filter((draft) => draft.phase === 'duplicate').length
  const createdLine = plural(created, 'carte créée', 'cartes créées')
  return duplicates > 0
    ? `${createdLine} · ${plural(duplicates, 'doublon', 'doublons')}`
    : createdLine
}

function AddPhotos() {
  const { leagueId } = Route.useParams()
  const quota = useUploadQuota(leagueId)
  const members = useMembers(leagueId)
  const capacity = draftCapacityOf(quota)
  const photoDrafts = usePhotoDrafts(capacity)
  const { drafts, selectedId, overflow } = photoDrafts
  const creation = useCreateCards(leagueId, drafts, photoDrafts.setPhase)

  const handlePick = (files: File[]): void => void photoDrafts.add(files)
  const readyCount = drafts.filter((draft) => draft.phase === 'ready').length
  const canCreate =
    !creation.isRunning &&
    readyCount > 0 &&
    !drafts.some((draft) => draft.phase === 'preparing') &&
    drafts.every((draft) => draft.phase !== 'ready' || isSendable(draft))
  const canAddMore = !creation.hasStarted && countQueuedDrafts(drafts) < capacity.slots
  const waitingMessage = drafts.find(
    (draft) => draft.phase === 'ready' && draft.errorMessage,
  )?.errorMessage
  const selectedIndex = drafts.findIndex((draft) => draft.id === selectedId)
  const selected = drafts[selectedIndex]

  if (drafts.length === 0) {
    return (
      <main className="screen">
        <TopBar title="Nouvelles cartes" />
        {overflow ? <Notice tone="info">{overflowMessage(overflow)}</Notice> : null}
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

  return (
    <main className="screen">
      <TopBar
        title={`Nouvelles cartes · ${plural(drafts.length, 'photo', 'photos')}`}
        start={<CloseUploadButton leagueId={leagueId} isRunning={creation.isRunning} />}
      />
      <DraftThumbs
        drafts={drafts}
        selectedId={selectedId}
        onSelect={photoDrafts.select}
        addTile={canAddMore ? <PhotoPicker variant="tile" onPick={handlePick} /> : null}
      />
      {overflow ? <Notice tone="info">{overflowMessage(overflow)}</Notice> : null}
      {waitingMessage ? <Notice tone="info">{waitingMessage}</Notice> : null}
      {selected ? (
        <DraftEditor
          draft={selected}
          position={selectedIndex + 1}
          total={drafts.length}
          members={members}
          isLocked={creation.hasStarted}
          onTitleChange={(title) => photoDrafts.setTitle(selected.id, title)}
          onToggleTag={(userId) => photoDrafts.toggleTag(selected.id, userId)}
          onRemove={() => photoDrafts.remove(selected.id)}
          onRetry={() => creation.retry(selected.id)}
        />
      ) : null}
      {creation.isDone ? (
        <>
          <p role="status" className="m-0 text-center font-display text-[15px] font-semibold">
            {summary(drafts)}
          </p>
          <Link
            to="/l/$leagueId/collection"
            params={{ leagueId }}
            className={buttonClassName({ variant: 'primary', block: true })}
          >
            Voir la collection
          </Link>
        </>
      ) : (
        <Button
          variant="primary"
          block
          disabled={!canCreate}
          isLoading={creation.isRunning}
          onClick={creation.start}
        >
          {creation.isRunning ? 'Création…' : `Créer ${plural(readyCount, 'carte', 'cartes')}`}
        </Button>
      )}
    </main>
  )
}
