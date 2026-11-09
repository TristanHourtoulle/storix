import { useRef, useState } from 'react'
import type { OwnedCardDetail } from '@storix/shared'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Notice } from '@/components/ui/notice'
import { userMessage } from '@/features/errors/user-message'
import { useWallet } from '@/features/game/use-wallet'
import { useCardMutations } from '../use-card-mutations'
import { useHoloTilt } from '../use-holo-tilt'
import { useReactions } from '../use-reactions'
import { TIER_LABELS } from '../tier-labels'
import { CardActions } from './card-actions'
import { CardFullscreen } from './card-fullscreen'
import { OwnedCardFace } from './owned-card-face'
import { authorLabel } from '../author-label'
import { MotionPrompt } from './motion-prompt'
import { useMemberAvatars } from '@/features/portraits/use-member-avatars'
import { MetaCell, discovererLabel, formatDate } from './meta-cell'
import { PromotedHolders } from './promoted-holders'
import { ReactionBar } from './reaction-bar'

const TAP_SLOP_PX = 10

interface CardDetailProps {
  leagueId: string
  card: OwnedCardDetail
  onWithdraw: () => void
}

export function CardDetail({ leagueId, card, onWithdraw }: CardDetailProps) {
  const { ref, needsMotionPermission, isMotionDenied, requestMotionPermission } = useHoloTilt()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const reactions = useReactions(leagueId, card.id)
  const avatars = useMemberAvatars(leagueId)
  const { recycle, upgradeToFoil, promote, convertStack } = useCardMutations(leagueId, card.id)
  const { data: wallet } = useWallet(leagueId)
  const isGold = card.displayTier === 'legendary' || card.displayTier === 'mythic'
  const hasFoil = card.copies.foil !== null
  const tagged = card.tagged
    .flatMap((person) => (person.displayUsername ? [person.displayUsername] : []))
    .join(', ')
  const copies = card.copiesInLeague
  const actionError = recycle.error ?? upgradeToFoil.error
  const isBusy =
    recycle.isPending || upgradeToFoil.isPending || promote.isPending || convertStack.isPending

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        className="tilt card-open"
        ref={ref}
        aria-label="Agrandir la carte"
        aria-haspopup="dialog"
        onPointerDown={(event) => {
          pointerStart.current = { x: event.clientX, y: event.clientY }
        }}
        onClick={(event) => {
          const start = pointerStart.current
          pointerStart.current = null
          const isTap =
            event.detail === 0 ||
            start === null ||
            Math.hypot(event.clientX - start.x, event.clientY - start.y) < TAP_SLOP_PX
          if (isTap) setIsFullscreen(true)
        }}
      >
        <OwnedCardFace card={card} size="hero" imageSizes="min(76vw, 340px)" isEager />
      </button>
      {isFullscreen ? (
        <CardFullscreen tier={card.displayTier} onClose={() => setIsFullscreen(false)}>
          <OwnedCardFace card={card} size="hero" imageSizes="min(88vw, 400px)" isEager />
        </CardFullscreen>
      ) : null}
      <MotionPrompt
        needsPermission={needsMotionPermission}
        isDenied={isMotionDenied}
        onRequest={requestMotionPermission}
      />
      <div className="pills">
        <span className={isGold ? 'pill gold' : 'pill'}>
          {TIER_LABELS[card.displayTier]}
          {card.isPromoted ? ' ★' : ''}
        </span>
        {hasFoil ? <span className="pill gold">Foil</span> : null}
        {card.isPromoted ? (
          <span className="pill">Rareté ligue : {TIER_LABELS[card.tier]}</span>
        ) : card.tier !== card.displayTier ? (
          <span className="pill">Actuellement {TIER_LABELS[card.tier]}</span>
        ) : null}
        {card.isProvisional ? <span className="pill">Provisoire</span> : null}
      </div>
      <h2 className="detail-name">{card.title}</h2>
      <div className="meta">
        <MetaCell
          label="Photo de"
          value={authorLabel(card.author)}
          leading={
            <Avatar
              label={authorLabel(card.author)}
              portrait={card.author.userId ? (avatars.get(card.author.userId) ?? null) : null}
            />
          }
        />
        <MetaCell label="Prise le" value={formatDate(card.capturedAt, 'Inconnue')} />
        <MetaCell label="Découverte par" value={discovererLabel(card.discoveredBy)} />
        <MetaCell
          label="Dans la ligue"
          value={`${copies} ${copies > 1 ? 'exemplaires' : 'exemplaire'}`}
        />
        <MetaCell label="Sur la photo" value={tagged || 'Personne'} />
      </div>
      <PromotedHolders holders={card.promotedHolders} avatars={avatars} />
      <ReactionBar
        reactions={card.reactions}
        canReact={card.canReact}
        onToggle={reactions.toggle}
      />
      <CardActions
        card={card}
        actions={card.actions}
        dust={wallet?.dust ?? null}
        isBusy={isBusy}
        promoteError={promote.error ? userMessage(promote.error) : null}
        convertError={convertStack.error ? userMessage(convertStack.error) : null}
        onRecycle={(variant) => recycle.mutate(variant)}
        onUpgrade={() => upgradeToFoil.mutate()}
        onPromote={(from, callbacks) => promote.mutate(from, callbacks)}
        onConvert={(body, callbacks) => convertStack.mutate(body, callbacks)}
        onSheetOpen={() => {
          promote.reset()
          convertStack.reset()
        }}
      />
      {card.canWithdraw ? (
        <Button variant="ghost" onClick={onWithdraw}>
          Retirer cette photo
        </Button>
      ) : null}
      {actionError ? <Notice tone="error">{userMessage(actionError)}</Notice> : null}
      {!actionError && reactions.isError ? (
        <Notice tone="error">Action impossible pour le moment. Réessaie.</Notice>
      ) : null}
    </div>
  )
}
