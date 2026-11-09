import type { CardProgression, CardTier, OwnedCardDetail } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { Icon } from '@/components/ui/icon'
import { Notice } from '@/components/ui/notice'
import { missingSummary, nextTierTone } from '../progression-copy'
import { TIER_LABELS } from '../tier-labels'
import { MaxedBox, SheetGauges } from './progression-gauges'
import { TierPreview } from './tier-preview'

interface PromotionSheetProps {
  open: boolean
  card: OwnedCardDetail
  progression: CardProgression
  isBusy: boolean
  error: string | null
  onConfirm: (from: CardTier) => void
  onClose: () => void
}

export function PromotionSheet({
  open,
  card,
  progression,
  isBusy,
  error,
  onConfirm,
  onClose,
}: PromotionSheetProps) {
  const { from } = card.actions.promotion

  return (
    <Dialog open={open} title="Améliorer la rareté" isDismissible={!isBusy} onClose={onClose}>
      {progression.kind === 'max' ? (
        <MaxedBox stackCount={progression.stackCount} convertAllDust={progression.convertAllDust} />
      ) : (
        <PromotionSteps
          card={card}
          progression={progression}
          from={from}
          isBusy={isBusy}
          error={error}
          onConfirm={onConfirm}
          onClose={onClose}
        />
      )}
    </Dialog>
  )
}

interface PromotionStepsProps {
  card: OwnedCardDetail
  progression: Exclude<CardProgression, { kind: 'max' }>
  from: CardTier
  isBusy: boolean
  error: string | null
  onConfirm: (from: CardTier) => void
  onClose: () => void
}

function PromotionSteps({
  card,
  progression,
  from,
  isBusy,
  error,
  onConfirm,
  onClose,
}: PromotionStepsProps) {
  const { to, cost, missingCopies } = progression
  const isReady = progression.kind === 'ready'
  const tone = nextTierTone(to)
  const summary = missingSummary(progression)

  return (
    <>
      <TierPreview card={card} from={from} to={to} isReady={isReady} />
      <p className={`sheet-step vitrine-step ${tone.className}`} style={tone.style}>
        {TIER_LABELS[from]}
        {card.isPromoted ? ' ★' : ''} <span aria-hidden="true">→</span>{' '}
        <span className="to">{TIER_LABELS[to]} ★</span>
      </p>
      <div className={tone.className} style={tone.style}>
        <SheetGauges progression={progression} />
      </div>
      {summary === null ? null : isReady ? (
        <p className="miss ok">
          <Icon name="check" className="size-4" />
          {summary}
        </p>
      ) : (
        <p className="miss">
          <span className="k">Encore</span>
          {summary}
        </p>
      )}
      {isReady ? (
        <>
          <p className="m-0 text-sm text-ink-2">
            Seule ta carte change. La rareté de la ligue reste {TIER_LABELS[card.tier]}. Ta rareté
            perso ne baissera jamais.
          </p>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <Button
            variant="primary"
            block
            className={`vitrine-go ${tone.className}`}
            style={tone.style}
            isLoading={isBusy}
            onClick={() => onConfirm(from)}
          >
            Améliorer · {cost} paillettes
          </Button>
        </>
      ) : (
        <>
          <p className="m-0 text-sm text-ink-2">
            {missingCopies > 0
              ? "Les doublons arrivent quand un booster te redonne cette carte : ils s'empilent ici."
              : "Recycle ou convertis d'autres cartes pour gagner des paillettes."}
          </p>
          {error ? <Notice tone="error">{error}</Notice> : null}
          <Button variant="ghost" block onClick={onClose}>
            Compris
          </Button>
        </>
      )}
    </>
  )
}
