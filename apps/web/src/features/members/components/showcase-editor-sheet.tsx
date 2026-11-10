import { useState } from 'react'
import { SHOWCASE_SLOTS, type OwnedCardSummary } from '@storix/shared'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { CollectionCardView } from '@/features/cards/components/collection-card-view'
import { useMemberCards } from '../use-member-cards'

interface ShowcaseEditorSheetProps {
  open: boolean
  leagueId: string
  initialIds: readonly string[]
  isSaving: boolean
  hasError: boolean
  onSave: (cardIds: readonly string[]) => void
  onReset: () => void
  onClose: () => void
}

const PICK_SIZES = '(max-width: 480px) 23vw, 100px'
const ALL_CARDS = { authorId: null, taggedUserId: null, revealOwn: false }

/** Sheet to pick, in order, the up to six owned cards shown on the viewer's page. */
export function ShowcaseEditorSheet({ open, ...rest }: ShowcaseEditorSheetProps) {
  return (
    <BottomSheet open={open} title="Ta vitrine" onClose={rest.onClose}>
      <ShowcaseEditorForm {...rest} />
    </BottomSheet>
  )
}

type ShowcaseEditorFormProps = Omit<ShowcaseEditorSheetProps, 'open'>

function ShowcaseEditorForm({
  leagueId,
  initialIds,
  isSaving,
  hasError,
  onSave,
  onReset,
}: ShowcaseEditorFormProps) {
  const [picked, setPicked] = useState<readonly string[]>(initialIds)
  const query = useMemberCards(leagueId, ALL_CARDS)
  const owned = query.cards.filter((card): card is OwnedCardSummary => card.kind === 'owned')
  const isFull = picked.length >= SHOWCASE_SLOTS

  function toggle(cardId: string) {
    setPicked((current) =>
      current.includes(cardId)
        ? current.filter((id) => id !== cardId)
        : current.length >= SHOWCASE_SLOTS
          ? current
          : [...current, cardId],
    )
  }

  return (
    <>
      <p className="m-0 text-sm text-muted">
        Choisis jusqu'à {SHOWCASE_SLOTS} cartes, dans l'ordre. Les emplacements libres se
        remplissent avec tes meilleures cartes.
      </p>
      {!query.data ? (
        <p className="mpage-cnt">Chargement…</p>
      ) : owned.length === 0 ? (
        <p className="mpage-cnt">Tu ne possèdes encore aucune carte.</p>
      ) : (
        <ul className="mpage-pick">
          {owned.map((card) => {
            const rank = picked.indexOf(card.id)
            const isPicked = rank >= 0
            return (
              <li key={card.id}>
                <button
                  type="button"
                  aria-pressed={isPicked}
                  aria-label={isPicked ? `${card.title}, position ${rank + 1}` : card.title}
                  disabled={!isPicked && isFull}
                  className="mpage-pick-btn"
                  onClick={() => toggle(card.id)}
                >
                  <CollectionCardView card={card} size="sm" sizes={PICK_SIZES} />
                  {isPicked ? (
                    <span className="mpage-pick-rank" aria-hidden="true">
                      {rank + 1}
                    </span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {query.hasNextPage ? (
        <Button
          variant="ghost"
          isLoading={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          Voir plus de cartes
        </Button>
      ) : null}
      {hasError ? <Notice tone="error">Enregistrement impossible. Réessaie.</Notice> : null}
      <div className="bsheet-footer">
        <Button variant="ghost" className="flex-1" disabled={isSaving} onClick={onReset}>
          Automatique
        </Button>
        <Button
          variant="primary"
          className="flex-1"
          isLoading={isSaving}
          onClick={() => onSave(picked)}
        >
          {`Enregistrer · ${picked.length}/${SHOWCASE_SLOTS}`}
        </Button>
      </div>
    </>
  )
}
