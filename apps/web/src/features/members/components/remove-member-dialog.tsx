import { useState } from 'react'
import type { MemberSummary, PhotosChoice } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Notice } from '@/components/ui/notice'
import { PhotosChoiceField, type PhotosChoiceOption } from './photos-choice-field'

interface RemoveMemberDialogProps {
  member: MemberSummary
  isPending: boolean
  errorMessage: string | null
  onConfirm: (photos: PhotosChoice) => void
  onClose: () => void
}

function deletedCardsCopy(count: number): string {
  if (count === 0) return 'Ses photos seront retirées de la ligue.'
  if (count === 1) {
    return 'Sa carte sera retirée de la ligue et ses propriétaires remboursés en paillettes.'
  }
  return `Ses ${count} cartes seront retirées de la ligue et leurs propriétaires remboursés en paillettes.`
}

function removalOptions(member: MemberSummary): PhotosChoiceOption[] {
  return [
    {
      value: 'keep',
      label: 'Garder ses photos dans la ligue',
      description: `Ses cartes restent dans la ligue, signées « Photo de ${member.displayUsername} · ancien membre ».`,
    },
    {
      value: 'delete',
      label: 'Retirer ses photos',
      description: deletedCardsCopy(member.authoredCardCount),
    },
  ]
}

export function RemoveMemberDialog({
  member,
  isPending,
  errorMessage,
  onConfirm,
  onClose,
}: RemoveMemberDialogProps) {
  const [photos, setPhotos] = useState<PhotosChoice | null>(null)

  return (
    <Dialog
      open
      title={`Retirer ${member.displayUsername} de la ligue ?`}
      onClose={onClose}
      isDismissible={!isPending}
    >
      <p className="m-0 text-sm leading-snug text-muted">
        Ce membre perdra l'accès à la ligue. Il pourra la rejoindre à nouveau avec une invitation.
      </p>
      <PhotosChoiceField
        legend="Ses photos"
        options={removalOptions(member)}
        value={photos}
        onChange={setPhotos}
        isDisabled={isPending}
      />
      {errorMessage ? <Notice tone="error">{errorMessage}</Notice> : null}
      <div className="flex gap-2">
        <Button variant="ghost" block disabled={isPending} onClick={onClose}>
          Annuler
        </Button>
        <Button
          variant="danger"
          block
          disabled={photos === null}
          isLoading={isPending}
          onClick={() => {
            if (photos) onConfirm(photos)
          }}
        >
          Retirer
        </Button>
      </div>
    </Dialog>
  )
}
