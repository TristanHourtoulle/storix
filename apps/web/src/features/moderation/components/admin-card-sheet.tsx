import { useState } from 'react'
import type { AdminCard } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { Chip } from '@/components/ui/chip'
import { Dialog } from '@/components/ui/dialog'
import { Notice } from '@/components/ui/notice'
import { formatCardNumber } from '@/features/cards/card-number'
import { CardFace } from '@/features/cards/components/card-face'
import { CardImage } from '@/features/cards/components/card-image'
import { authorLabel } from '@/features/cards/author-label'
import { MetaCell, formatDate } from '@/features/cards/components/meta-cell'
import { TIER_LABELS } from '@/features/cards/tier-labels'
import { userMessage } from '@/features/errors/user-message'
import { playSound } from '@/features/sound/sound'
import type { CardModeration } from '../use-card-moderation'
import { DeleteCardConfirm } from './delete-card-dialog'
import { TierBoundsPicker } from './tier-bounds-picker'
import { TierPinPicker } from './tier-pin-picker'

const SOURCE_LABELS: Record<AdminCard['tierSource'], string> = {
  computed: 'Calculée',
  bounded: 'Bornée',
  pinned: 'Fixée',
}

interface AdminCardSheetProps {
  card: AdminCard | null
  mythicCount: number
  moderation: CardModeration
  onClose: () => void
}

function firstError(moderation: CardModeration): string | null {
  const failed = [
    moderation.setVisibility,
    moderation.pinTier,
    moderation.setBounds,
    moderation.validateDate,
  ].find((mutation) => mutation.isError)
  return failed?.error ? userMessage(failed.error) : null
}

export function AdminCardSheet({ card, mythicCount, moderation, onClose }: AdminCardSheetProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const isBusy =
    moderation.setVisibility.isPending ||
    moderation.pinTier.isPending ||
    moderation.setBounds.isPending ||
    moderation.validateDate.isPending

  if (!card)
    return (
      <Dialog open={false} title="Carte" onClose={onClose}>
        {null}
      </Dialog>
    )

  const cardId = card.id
  const title = isDeleting
    ? `Supprimer définitivement la carte ${formatCardNumber(card.number)} ?`
    : card.title
  const isHidden = card.status === 'hidden'
  const hasDate = card.capturedAt !== null
  const showComputed = card.computedTier !== null && card.computedTier !== card.tier

  function closeAll(): void {
    setIsDeleting(false)
    moderation.deleteCard.reset()
    onClose()
  }

  return (
    <Dialog open title={title} onClose={closeAll} isDismissible={!moderation.deleteCard.isPending}>
      {isDeleting ? (
        <DeleteCardConfirm
          copiesInLeague={card.copiesInLeague}
          isPending={moderation.deleteCard.isPending}
          errorMessage={
            moderation.deleteCard.error ? userMessage(moderation.deleteCard.error) : null
          }
          onCancel={() => {
            moderation.deleteCard.reset()
            setIsDeleting(false)
          }}
          onConfirm={() => moderation.deleteCard.mutate({ cardId }, { onSuccess: closeAll })}
        />
      ) : (
        <>
          <div className="flex flex-col items-center gap-4">
            <div style={{ width: 150 }}>
              <CardFace size="md" title={card.title} tier={card.tier} isProvisional={false}>
                <CardImage
                  image={card.image}
                  thumbhash={card.thumbhash}
                  width={card.width}
                  height={card.height}
                  sizes="150px"
                  isEager
                />
              </CardFace>
            </div>
            <div className="pills flex-wrap justify-center">
              <span className="pill">{TIER_LABELS[card.tier]}</span>
              <span className="pill">{SOURCE_LABELS[card.tierSource]}</span>
              {showComputed && card.computedTier ? (
                <span className="pill">{`Calculée : ${TIER_LABELS[card.computedTier]}`}</span>
              ) : null}
              {isHidden ? <span className="pill">Masquée</span> : null}
            </div>
            <div className="meta w-full">
              <MetaCell label="Photo de" value={authorLabel(card.author)} />
              <MetaCell label="Numéro" value={formatCardNumber(card.number)} />
            </div>
          </div>
          <div className="admin-sheet-meta">
            <span>
              {hasDate
                ? `Prise le ${formatDate(card.capturedAt, 'Inconnue')}`
                : 'Date de prise inconnue'}
            </span>
            <Chip
              label={hasDate ? 'Date vérifiée' : 'Pas de date'}
              isOn={card.isCaptureDateValidated}
              isDisabled={!hasDate || isBusy}
              onToggle={() =>
                moderation.validateDate.mutate({
                  cardId,
                  isValidated: !card.isCaptureDateValidated,
                })
              }
            />
          </div>
          <TierPinPicker
            pinnedTier={card.pinnedTier}
            mythicCount={mythicCount}
            isBusy={isBusy}
            onChange={(tier) =>
              moderation.pinTier.mutate(
                { cardId, tier },
                {
                  onSuccess: (updated) =>
                    playSound({ name: updated.pinnedTier === 'mythic' ? 'pinMythic' : 'confirm' }),
                },
              )
            }
          />
          <TierBoundsPicker
            min={card.minTier}
            max={card.maxTier}
            isPinned={card.pinnedTier !== null}
            isBusy={isBusy}
            onChange={(bounds) => moderation.setBounds.mutate({ cardId, ...bounds })}
          />
          {firstError(moderation) ? <Notice tone="error">{firstError(moderation)}</Notice> : null}
          <Button
            variant="ghost"
            disabled={isBusy}
            onClick={() =>
              moderation.setVisibility.mutate({ cardId, status: isHidden ? 'active' : 'hidden' })
            }
          >
            {isHidden ? 'Réafficher' : 'Masquer'}
          </Button>
          <Button
            variant="ghost"
            className="!text-danger"
            disabled={isBusy}
            onClick={() => setIsDeleting(true)}
          >
            Supprimer…
          </Button>
        </>
      )}
    </Dialog>
  )
}
