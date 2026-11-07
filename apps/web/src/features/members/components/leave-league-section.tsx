import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import type { LeagueSummary, PhotosChoice } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Notice } from '@/components/ui/notice'
import { useAuthoredCardCount } from '../use-authored-card-count'
import { useLeaveLeague } from '../use-leave-league'
import { PhotosChoiceField, type PhotosChoiceOption } from './photos-choice-field'

interface LeaveLeagueSectionProps {
  userId: string
  displayUsername: string
  league: LeagueSummary
  isHomeLeague: boolean
}

const OUTCOME_COPY: Record<PhotosChoice | 'none', string> = {
  keep: 'Tes cartes resteront dans la ligue et tes exemplaires seront perdus.',
  delete: 'Tes cartes seront retirées de la ligue et tes exemplaires perdus.',
  none: 'Tes exemplaires seront perdus.',
}

function leaveOptions(displayUsername: string): PhotosChoiceOption[] {
  return [
    {
      value: 'keep',
      label: 'Garder mes photos dans la ligue',
      description: `Les autres verront « Photo de ${displayUsername} · ancien membre ».`,
    },
    {
      value: 'delete',
      label: 'Retirer mes photos',
      description: 'Tes cartes sont retirées et leurs propriétaires remboursés en paillettes.',
    },
  ]
}

export function LeaveLeagueSection({
  userId,
  displayUsername,
  league,
  isHomeLeague,
}: LeaveLeagueSectionProps) {
  const { leave, reset, isPending, errorMessage } = useLeaveLeague(userId, league.id)
  const [isOpen, setIsOpen] = useState(false)
  const [photos, setPhotos] = useState<PhotosChoice | null>(null)
  const hasNoPhotos = useAuthoredCardCount(league.id, userId) === 0
  const choice: PhotosChoice | null = hasNoPhotos ? 'keep' : photos

  if (league.role === 'owner') {
    return (
      <section aria-label="Quitter la ligue" className="flex flex-col gap-2">
        <p className="m-0 text-sm leading-snug text-muted">
          Transfère la propriété depuis l'administration avant de quitter la ligue.
        </p>
        <Link
          to="/l/$leagueId/admin"
          params={{ leagueId: league.id }}
          className="text-sm font-semibold text-accent"
        >
          Ouvrir l'administration
        </Link>
      </section>
    )
  }

  const open = () => {
    reset()
    setPhotos(null)
    setIsOpen(true)
  }

  return (
    <section aria-label="Quitter la ligue">
      <Button variant="danger" block onClick={open}>
        Quitter la ligue
      </Button>
      {isOpen ? (
        <Dialog
          open
          title={`Quitter ${league.name} ?`}
          onClose={() => setIsOpen(false)}
          isDismissible={!isPending}
        >
          <p className="m-0 text-sm leading-snug text-muted">{OUTCOME_COPY[hasNoPhotos ? 'none' : (photos ?? 'none')]}</p>
          {isHomeLeague ? (
            <Notice tone="error">
              C'est ta ligue d'origine : plus personne ne pourra te générer de code de
              réinitialisation.
            </Notice>
          ) : null}
          {hasNoPhotos ? null : (
            <PhotosChoiceField
              legend="Tes photos"
              options={leaveOptions(displayUsername)}
              value={photos}
              onChange={setPhotos}
              isDisabled={isPending}
            />
          )}
          {errorMessage ? <Notice tone="error">{errorMessage}</Notice> : null}
          <div className="flex gap-2">
            <Button variant="ghost" block disabled={isPending} onClick={() => setIsOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="danger"
              block
              disabled={choice === null}
              isLoading={isPending}
              onClick={() => {
                if (choice) leave(choice)
              }}
            >
              Quitter
            </Button>
          </div>
        </Dialog>
      ) : null}
    </section>
  )
}
