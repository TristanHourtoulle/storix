import { useEffect, useRef, useState } from 'react'
import type { MemberSummary } from '@storix/shared'
import { CARD_CROP_FRAME } from '@storix/shared/domain'
import { CropEditor } from '@/components/crop/crop-editor'
import { Icon } from '@/components/ui/icon'
import { Notice } from '@/components/ui/notice'
import { overflowMessage } from '../upload-copy'
import type { StackCard as StackCardModel } from '../session/session-reducer'
import type { UploadSession } from '../session/use-upload-session'
import { StackCard, type StackCardRole } from './stack-card'
import { cardImageOf } from './stack-card-art'
import { StackControls } from './stack-controls'
import { StackFields } from './stack-fields'
import { useReducedMotion } from './stack-motion'
import { useStackGesture } from './use-stack-gesture'
import { useStackNavigation } from './use-stack-navigation'

interface CardStackProps {
  session: UploadSession
  members: readonly MemberSummary[]
  onClose: () => void
  onOverlayChange: (close: (() => void) | null) => void
}

interface DeckSlot {
  card: StackCardModel
  role: StackCardRole
}

function deckSlots(cards: readonly StackCardModel[], index: number): DeckSlot[] {
  const roles: ReadonlyArray<readonly [number, StackCardRole]> = [
    [index - 1, 'prev'],
    [index, 'top'],
    [index + 1, 'under'],
    [index + 2, 'under-2'],
  ]
  return roles.flatMap(([at, role]) => {
    const card = cards[at]
    return card ? [{ card, role }] : []
  })
}

function CropDialog({
  card,
  onClose,
  onConfirm,
}: {
  card: StackCardModel
  onClose: () => void
  onConfirm: (crop: StackCardModel['crop']) => void
}) {
  const source = cardImageOf(card)
  if (!source) return null
  return (
    <CropEditor
      imageUrl={source.src}
      imageSize={source.size}
      frame={CARD_CROP_FRAME}
      value={card.crop}
      title="Recadrer"
      subtitle="Format de la carte, 63 × 88"
      onCancel={onClose}
      onConfirm={(crop) => {
        onConfirm(crop)
        onClose()
      }}
    />
  )
}

/** The swipeable stack of picked photos (proposal D). */
export function CardStack({ session, members, onClose, onOverlayChange }: CardStackProps) {
  const { state } = session
  const reduced = useReducedMotion()
  const [cropFor, setCropFor] = useState<string | null>(null)
  const topRef = useRef<HTMLDivElement | null>(null)
  const underRef = useRef<HTMLDivElement | null>(null)
  const prevRef = useRef<HTMLDivElement | null>(null)
  const titleRef = useRef<HTMLInputElement | null>(null)
  const deckRef = useRef<HTMLDivElement | null>(null)
  const current = state.cards[state.index]
  const cropCard = state.cards.find((card) => card.localId === cropFor) ?? null
  const canPrev = state.index > 0
  const isLast = state.index >= state.cards.length - 1

  const navigation = useStackNavigation({
    session,
    reduced,
    isPaused: cropCard !== null,
    topRef,
    underRef,
    prevRef,
    titleRef,
    deckRef,
  })
  const { bind, isDragging } = useStackGesture({
    canPrev,
    reduced,
    isLocked: navigation.isLocked,
    topRef,
    underRef,
    prevRef,
    onNext: () => void navigation.goNext(),
    onPrev: () => void navigation.goPrev(),
  })

  const isCropOpen = cropCard !== null
  useEffect(() => {
    onOverlayChange(isCropOpen ? () => setCropFor(null) : null)
    return () => onOverlayChange(null)
  }, [isCropOpen, onOverlayChange])

  if (!current) return null

  const refFor = (role: StackCardRole) =>
    role === 'top' ? topRef : role === 'under' ? underRef : role === 'prev' ? prevRef : undefined

  const openSummary = (): void => {
    session.dispatch({ type: 'screen', screen: 'summary' })
    void session.flush()
  }

  return (
    <main className="screen">
      <header className="flex min-h-11 items-center justify-between gap-3">
        <button type="button" aria-label="Fermer" className="icon-btn" onClick={onClose}>
          <Icon name="close" className="size-5" />
        </button>
        <p
          aria-live="polite"
          className="m-0 font-display text-[15px] font-semibold tabular-nums text-ink-3"
        >
          {state.index + 1} / {state.cards.length}
        </p>
        <button
          type="button"
          aria-label="Voir toutes les photos"
          className="icon-btn"
          onClick={openSummary}
        >
          <Icon name="grid" className="size-5" />
        </button>
      </header>
      {state.overflow ? <Notice tone="info">{overflowMessage(state.overflow)}</Notice> : null}
      {state.notice ? <Notice tone="info">{state.notice}</Notice> : null}
      <div
        ref={deckRef}
        {...bind}
        className="-mx-4 grid h-[338px] touch-pan-y justify-center overflow-x-clip pt-1.5"
      >
        {deckSlots(state.cards, state.index).map(({ card, role }) => (
          <StackCard
            key={card.localId}
            card={card}
            role={role}
            elementRef={refFor(role)}
            titleRef={role === 'top' ? titleRef : undefined}
            isDragging={isDragging}
            onTitleChange={(title) => session.edit(card.localId, { title })}
            onTitleEnter={() => void navigation.goNext({ focusTitle: true })}
            onCrop={() => setCropFor(card.localId)}
          />
        ))}
      </div>
      <div className="pb-1">
        <StackControls
          canPrev={canPrev}
          isLast={isLast}
          onPrev={() => void navigation.goPrev()}
          onRemove={() => void navigation.removeCurrent()}
          onNext={() => void navigation.goNext()}
        />
      </div>
      <StackFields
        card={current}
        previous={state.cards[state.index - 1] ?? null}
        members={members}
        onToggleTag={(userId) =>
          session.edit(current.localId, {
            taggedUserIds: current.taggedUserIds.includes(userId)
              ? current.taggedUserIds.filter((id) => id !== userId)
              : [...current.taggedUserIds, userId],
          })
        }
        onCopyPreviousTags={() => session.copyPreviousTags(current.localId)}
        onRetry={() => session.retry(current.localId)}
      />
      {cropCard ? (
        <CropDialog
          card={cropCard}
          onClose={() => setCropFor(null)}
          onConfirm={(crop) => session.edit(cropCard.localId, { crop })}
        />
      ) : null}
    </main>
  )
}
