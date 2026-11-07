import type { OwnedCardDetail } from '@storix/shared'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { useCardMutations } from '../use-card-mutations'
import { useHoloTilt } from '../use-holo-tilt'
import { useReactions } from '../use-reactions'
import { TIER_LABELS } from '../tier-labels'
import { CardActions } from './card-actions'
import { CardFace } from './card-face'
import { CardImage } from './card-image'
import { authorLabel } from '../author-label'
import { MotionPrompt } from './motion-prompt'
import { MetaCell, discovererLabel, formatDate } from './meta-cell'
import { ReactionBar } from './reaction-bar'

interface CardDetailProps {
  leagueId: string
  card: OwnedCardDetail
  onWithdraw: () => void
}

export function CardDetail({ leagueId, card, onWithdraw }: CardDetailProps) {
  const { ref, isDragTilt, needsMotionPermission, isMotionDenied, requestMotionPermission } =
    useHoloTilt()
  const reactions = useReactions(leagueId, card.id)
  const { recycle, upgradeToFoil } = useCardMutations(leagueId, card.id)
  const isGold = card.displayTier === 'legendary' || card.displayTier === 'mythic'
  const hasFoil = card.copies.foil !== null
  const tagged = card.tagged
    .flatMap((person) => (person.displayUsername ? [person.displayUsername] : []))
    .join(', ')
  const copies = card.copiesInLeague
  const hasFailed = recycle.isError || upgradeToFoil.isError || reactions.isError

  return (
    <div className="flex flex-col items-center gap-4">
      <div className={isDragTilt ? 'tilt is-drag' : 'tilt'} ref={ref}>
        <CardFace
          size="xl"
          title={card.title}
          tier={card.displayTier}
          isProvisional={card.isProvisional}
          isFoil={hasFoil}
          hasFoilPip={hasFoil}
        >
          <CardImage
            image={card.image}
            thumbhash={card.thumbhash}
            width={card.width}
            height={card.height}
            sizes="236px"
            isEager
          />
        </CardFace>
      </div>
      <MotionPrompt
        needsPermission={needsMotionPermission}
        isDenied={isMotionDenied}
        onRequest={requestMotionPermission}
      />
      <div className="pills">
        <span className={isGold ? 'pill gold' : 'pill'}>{TIER_LABELS[card.displayTier]}</span>
        {hasFoil ? <span className="pill gold">Foil</span> : null}
        {card.tier !== card.displayTier ? (
          <span className="pill">Actuellement {TIER_LABELS[card.tier]}</span>
        ) : null}
        {card.isProvisional ? <span className="pill">Provisoire</span> : null}
      </div>
      <h2 className="detail-name">{card.title}</h2>
      <div className="meta">
        <MetaCell label="Photo de" value={authorLabel(card.author)} />
        <MetaCell label="Prise le" value={formatDate(card.capturedAt, 'Inconnue')} />
        <MetaCell label="Découverte par" value={discovererLabel(card.discoveredBy)} />
        <MetaCell
          label="Dans la ligue"
          value={`${copies} ${copies > 1 ? 'exemplaires' : 'exemplaire'}`}
        />
        <MetaCell label="Sur la photo" value={tagged || 'Personne'} />
      </div>
      <ReactionBar
        reactions={card.reactions}
        canReact={card.canReact}
        onToggle={reactions.toggle}
      />
      <CardActions
        actions={card.actions}
        isBusy={recycle.isPending || upgradeToFoil.isPending}
        onRecycle={(variant) => recycle.mutate(variant)}
        onUpgrade={() => upgradeToFoil.mutate()}
      />
      {card.canWithdraw ? (
        <Button variant="ghost" onClick={onWithdraw}>
          Retirer cette photo
        </Button>
      ) : null}
      {hasFailed ? <Notice tone="error">Action impossible pour le moment. Réessaie.</Notice> : null}
    </div>
  )
}
