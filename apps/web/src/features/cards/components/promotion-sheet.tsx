import type { CardTier, PromotionAction } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Notice } from '@/components/ui/notice'
import { TIER_LABELS } from '../tier-labels'

interface PromotionSheetProps {
  open: boolean
  promotion: PromotionAction
  leagueTier: CardTier
  dust: number | null
  isBusy: boolean
  error: string | null
  onConfirm: (from: CardTier) => void
  onClose: () => void
}

function missingLine(missing: number, singular: string, plural: string): string | null {
  if (missing <= 0) return null
  return `Il te manque ${missing} ${missing > 1 ? plural : singular}`
}

export function PromotionSheet({
  open,
  promotion,
  leagueTier,
  dust,
  isBusy,
  error,
  onConfirm,
  onClose,
}: PromotionSheetProps) {
  const { from, to, cost, copiesAvailable, copiesRequired } = promotion
  const isMax = promotion.reason === 'max_tier' || to === null || cost === null
  const missing = isMax
    ? []
    : [
        missingLine(copiesRequired - copiesAvailable, 'doublon', 'doublons'),
        dust === null ? null : missingLine(cost - dust, 'paillette', 'paillettes'),
      ].filter((line): line is string => line !== null)

  return (
    <Dialog open={open} title="Améliorer la rareté" isDismissible={!isBusy} onClose={onClose}>
      {isMax ? (
        <p className="m-0 text-sm text-ink-2">Ta carte est déjà Mythique.</p>
      ) : (
        <>
          <p className="sheet-step">
            {TIER_LABELS[from]} → {TIER_LABELS[to]} ★
          </p>
          <div className="sheet-rows">
            <p className="sheet-row">{`Doublons : ${copiesAvailable} / ${copiesRequired}`}</p>
            <p className="sheet-row">{`Paillettes : ${dust ?? '…'} / ${cost}`}</p>
          </div>
          {missing.map((line) => (
            <p key={line} className="m-0 text-sm font-semibold text-danger">
              {line}
            </p>
          ))}
          <p className="m-0 text-sm text-ink-2">
            Seule ta carte change. La rareté de la ligue reste {TIER_LABELS[leagueTier]}. Ta rareté
            perso ne baissera jamais.
          </p>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <Button
            variant="primary"
            block
            disabled={!promotion.allowed || dust === null}
            isLoading={isBusy}
            onClick={() => onConfirm(from)}
          >
            Améliorer · {cost} paillettes
          </Button>
        </>
      )}
    </Dialog>
  )
}
