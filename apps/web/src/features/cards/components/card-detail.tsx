import { useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { REACTION_TYPES, hasRoleAtLeast, type OwnedCardDetail } from '@storix/shared'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Notice } from '@/components/ui/notice'
import { userMessage } from '@/features/errors/user-message'
import { useWallet } from '@/features/game/use-wallet'
import { leagueDetailQueryOptions } from '@/features/leagues/leagues.queries'
import { ShareSheet } from '@/features/share/components/share-sheet'
import { writeShareStyle } from '@/features/share/share-style'
import { subjectFromCardDetail, type ShareSubject } from '@/features/share/share-subject'
import { useCardMutations } from '../use-card-mutations'
import { useCardTag } from '../use-card-tag'
import { useHoloTilt } from '../use-holo-tilt'
import { useReactions } from '../use-reactions'
import { TIER_LABELS } from '../tier-labels'
import { CardActions } from './card-actions'
import { CardFullscreen } from './card-fullscreen'
import { OwnedCardFace } from './owned-card-face'
import { authorLabel } from '../author-label'
import { MotionPrompt } from './motion-prompt'
import { useMemberAvatars } from '@/features/portraits/use-member-avatars'
import { AuthorLink } from './author-link'
import { MetaCell, discovererLabel, formatDate } from './meta-cell'
import { PromotedHolders } from './promoted-holders'
import { PromotionCelebration, type Celebration } from './promotion-celebration'
import { RarityJourney } from './rarity-journey'
import { ReactionBar } from './reaction-bar'
import { ReactionsSheet, type ReactionTab } from './reactions-sheet'
import { ReactorsSummary } from './reactors-summary'
import { useCardReactors } from '../use-card-reactors'

const TAP_SLOP_PX = 10

interface CardDetailProps {
  leagueId: string
  card: OwnedCardDetail
  meId: string
  onWithdraw: () => void
}

export function CardDetail({ leagueId, card, meId, onWithdraw }: CardDetailProps) {
  const { ref, needsMotionPermission, isMotionDenied, requestMotionPermission } = useHoloTilt()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [shareSubject, setShareSubject] = useState<ShareSubject | null>(null)
  const [celebration, setCelebration] = useState<Celebration | null>(null)
  const league = useQuery(leagueDetailQueryOptions(leagueId)).data
  const leagueName = league?.name ?? ''
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const reactions = useReactions(leagueId, card.id)
  const avatars = useMemberAvatars(leagueId)
  const reactionTotal = REACTION_TYPES.reduce((sum, type) => sum + card.reactions[type].count, 0)
  const reactors = useCardReactors(leagueId, card.id, reactionTotal > 0)
  const [isReactionsOpen, setIsReactionsOpen] = useState(false)
  const [reactionTab, setReactionTab] = useState<ReactionTab>('all')
  const openReactions = (tab: ReactionTab) => {
    setReactionTab(tab)
    setIsReactionsOpen(true)
  }
  const { recycle, upgradeToFoil, promote, convertStack } = useCardMutations(leagueId, card.id)
  const { data: wallet } = useWallet(leagueId)
  const isGold = card.displayTier === 'legendary' || card.displayTier === 'mythic'
  const hasFoil = card.copies.foil !== null
  const tagged = card.tagged
    .flatMap((person) => (person.displayUsername ? [person.displayUsername] : []))
    .join(', ')
  const copies = card.copiesInLeague
  const tag = useCardTag(leagueId, card.id)
  const isTagged = card.tagged.some((person) => person.userId === meId)
  const canRemoveOthersTags =
    card.author.userId === meId || (league !== undefined && hasRoleAtLeast(league.myRole, 'admin'))
  const removableTags = canRemoveOthersTags
    ? card.tagged.flatMap((person) =>
        person.userId === null || person.userId === meId
          ? []
          : [{ userId: person.userId, name: person.displayUsername ?? 'Ancien membre' }],
      )
    : []
  const tagError = tag.add.error ?? tag.remove.error
  const actionError = recycle.error
  const isBusy =
    recycle.isPending || upgradeToFoil.isPending || promote.isPending || convertStack.isPending

  return (
    <div className="flex flex-1 flex-col items-center gap-4">
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
        <OwnedCardFace card={card} size="showcase" imageSizes="min(76vw, 340px)" isEager />
      </button>
      {isFullscreen ? (
        <CardFullscreen tier={card.displayTier} onClose={() => setIsFullscreen(false)}>
          <OwnedCardFace card={card} size="showcase" imageSizes="min(88vw, 400px)" isEager />
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
        <AuthorLink leagueId={leagueId} author={card.author}>
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
        </AuthorLink>
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
        onOpenReactors={openReactions}
      />
      {reactionTotal > 0 ? (
        <ReactorsSummary
          reactors={reactors.data?.reactors ?? []}
          avatars={avatars}
          onOpen={() => openReactions('all')}
        />
      ) : null}
      <ReactionsSheet
        open={isReactionsOpen}
        leagueId={leagueId}
        tab={reactionTab}
        onTabChange={setReactionTab}
        counts={card.reactions}
        reactors={reactors.data?.reactors}
        isLoading={reactionTotal > 0 && reactors.isPending}
        avatars={avatars}
        onClose={() => setIsReactionsOpen(false)}
      />
      <Button
        variant="ghost"
        onClick={() => setShareSubject(subjectFromCardDetail(card, meId, leagueName))}
      >
        <Icon name="share" className="size-5" />
        Partager
      </Button>
      {shareSubject ? (
        <ShareSheet subject={shareSubject} onClose={() => setShareSubject(null)} />
      ) : null}
      {celebration ? (
        <PromotionCelebration
          card={card}
          celebration={celebration}
          onShare={() => {
            writeShareStyle('flex')
            setCelebration(null)
            setShareSubject(subjectFromCardDetail(card, meId, leagueName))
          }}
          onClose={() => setCelebration(null)}
        />
      ) : null}
      {card.canWithdraw ? (
        <Button variant="ghost" onClick={onWithdraw}>
          Retirer cette photo
        </Button>
      ) : null}
      {actionError ? <Notice tone="error">{userMessage(actionError)}</Notice> : null}
      {tagError ? <Notice tone="error">{userMessage(tagError)}</Notice> : null}
      {!actionError && reactions.isError ? (
        <Notice tone="error">Action impossible pour le moment. Réessaie.</Notice>
      ) : null}
      <CardActions
        card={card}
        dust={wallet?.dust ?? null}
        isBusy={isBusy}
        promoteError={promote.error ? userMessage(promote.error) : null}
        convertError={convertStack.error ? userMessage(convertStack.error) : null}
        foilError={upgradeToFoil.error ? userMessage(upgradeToFoil.error) : null}
        onRecycle={(variant) => recycle.mutate(variant)}
        onUpgrade={(callbacks) => {
          const tier = card.displayTier
          upgradeToFoil.mutate(undefined, {
            ...callbacks,
            onSuccess: () => {
              callbacks.onSuccess()
              setCelebration({ kind: 'foil', tier })
            },
          })
        }}
        onPromote={(from, callbacks) => {
          const { to } = card.actions.promotion
          promote.mutate(from, {
            ...callbacks,
            onSuccess: () => {
              callbacks.onSuccess()
              if (to !== null) setCelebration({ kind: 'promote', from, to })
            },
          })
        }}
        onConvert={(body, callbacks) => convertStack.mutate(body, callbacks)}
        tagState={{ isTagged, isBusy: tag.add.isPending || tag.remove.isPending }}
        onToggleTag={() => {
          tag.add.reset()
          tag.remove.reset()
          if (isTagged) tag.remove.mutate(meId)
          else tag.add.mutate()
        }}
        removableTags={removableTags}
        onRemoveTag={(userId) => {
          tag.add.reset()
          tag.remove.reset()
          tag.remove.mutate(userId)
        }}
        onSheetOpen={() => {
          promote.reset()
          convertStack.reset()
          upgradeToFoil.reset()
        }}
      />
      <RarityJourney leagueId={leagueId} cardId={card.id} />
    </div>
  )
}
