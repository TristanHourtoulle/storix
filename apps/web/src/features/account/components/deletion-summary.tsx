import type { AccountDeletionPreview, LeagueCardCount, PhotosChoice } from '@storix/shared'
import {
  PhotosChoiceField,
  type PhotosChoiceOption,
} from '@/features/members/components/photos-choice-field'

const LIST_FORMAT = new Intl.ListFormat('fr-FR', { type: 'conjunction' })

interface DeletionSummaryProps {
  preview: AccountDeletionPreview
  photos: PhotosChoice | null
  onPhotosChange: (photos: PhotosChoice) => void
  isDisabled: boolean
}

function cardsLabel(count: number, participle: string): string {
  return count === 1 ? `1 carte ${participle}e` : `${count} cartes ${participle}es`
}

function sumCards(leagues: readonly LeagueCardCount[]): number {
  return leagues.reduce((total, league) => total + league.cardCount, 0)
}

function namesOf(leagues: readonly { name: string }[]): string {
  return LIST_FORMAT.format(leagues.map((league) => league.name))
}

/** Number of authored cards the deletion removes for the given photos choice. */
export function removedCardCount(
  preview: AccountDeletionPreview,
  photos: PhotosChoice | null,
): number {
  const kept =
    sumCards(preview.anonymizedLeagues) + (photos === 'keep' ? sumCards(preview.choiceLeagues) : 0)
  return Math.max(0, preview.authoredCardCount - kept)
}

function choiceOptions(choiceCards: number): PhotosChoiceOption[] {
  return [
    {
      value: 'keep',
      label: 'Garder mes photos',
      description: 'Elles restent dans ces ligues, signées « Ancien membre ».',
    },
    {
      value: 'delete',
      label: 'Supprimer mes photos',
      description: `${cardsLabel(choiceCards, 'retiré')}, leurs propriétaires remboursés en paillettes.`,
    },
  ]
}

export function DeletionSummary({
  preview,
  photos,
  onPhotosChange,
  isDisabled,
}: DeletionSummaryProps) {
  const { solo, choiceLeagues, anonymizedLeagues } = preview
  const isChoiceNeeded = choiceLeagues.length > 0
  const removed = removedCardCount(preview, photos)
  const removedLabel = cardsLabel(removed, 'retiré')

  return (
    <div className="flex flex-col gap-3 text-sm leading-snug text-muted">
      {solo.length > 0 ? (
        <p className="m-0">Ligues supprimées avec ton compte : {namesOf(solo)}.</p>
      ) : null}
      {isChoiceNeeded ? (
        <PhotosChoiceField
          legend={`Tes photos dans ${namesOf(choiceLeagues)}`}
          options={choiceOptions(sumCards(choiceLeagues))}
          value={photos}
          onChange={onPhotosChange}
          isDisabled={isDisabled}
        />
      ) : null}
      {anonymizedLeagues.length > 0 ? (
        <p className="m-0">
          {cardsLabel(sumCards(anonymizedLeagues), 'déjà gardé')} dans {namesOf(anonymizedLeagues)}{' '}
          {sumCards(anonymizedLeagues) === 1 ? 'reste signée' : 'restent signées'} « Ancien membre
          ».
        </p>
      ) : null}
      {!isChoiceNeeded || photos !== null ? (
        <p className="m-0 font-semibold text-ink">{removedLabel}. C'est irréversible.</p>
      ) : null}
    </div>
  )
}
