import type { KeyboardEvent, Ref } from 'react'
import { CARD_TITLE_MAX_LENGTH } from '@storix/shared'
import { Icon } from '@/components/ui/icon'
import { CardFace } from '@/features/cards/components/card-face'
import { UploadStatusBadge } from '../components/upload-status-badge'
import { isBlankTitle, type StackCard as StackCardModel } from '../session/session-reducer'
import { StackCardArt, cardImageOf } from './stack-card-art'

export type StackCardRole = 'top' | 'under' | 'under-2' | 'prev'

interface StackCardProps {
  card: StackCardModel
  role: StackCardRole
  elementRef?: Ref<HTMLDivElement>
  titleRef?: Ref<HTMLInputElement>
  isDragging?: boolean
  onTitleChange?: (title: string) => void
  onTitleEnter?: () => void
  onCrop?: () => void
}

const ROLE_CLASS: Record<StackCardRole, string> = {
  top: 'z-[3]',
  under: 'z-[2] [transform:translateY(10px)_scale(.94)] transition-transform duration-[280ms]',
  'under-2':
    'z-[1] [transform:translateY(20px)_scale(.88)] opacity-70 transition-[transform,opacity] duration-[280ms]',
  prev: 'z-[4] invisible [transform:translateX(110%)]',
}

const TITLE_INPUT_ID = 'stack-card-title'
const SIZES = '220px'

function TitleBand({
  card,
  titleRef,
  onTitleChange,
  onTitleEnter,
}: Pick<StackCardProps, 'card' | 'titleRef' | 'onTitleChange' | 'onTitleEnter'>) {
  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return
    event.preventDefault()
    onTitleEnter?.()
  }
  return (
    <div className="card-band gap-1 bg-gradient-to-b from-transparent to-bg/95 to-45% pt-8">
      <label className="sr-only" htmlFor={TITLE_INPUT_ID}>
        Titre de la carte
      </label>
      <input
        ref={titleRef}
        id={TITLE_INPUT_ID}
        type="text"
        value={card.title}
        maxLength={CARD_TITLE_MAX_LENGTH}
        autoComplete="off"
        enterKeyHint="next"
        placeholder="Écris le titre ici"
        onChange={(event) => onTitleChange?.(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
        className="w-full rounded-lg border-0 bg-white/8 px-2 py-1.5 font-display text-[15px] font-semibold text-ink shadow-[inset_0_0_0_1px_rgb(255_255_255/0.16)] placeholder:text-ink/55 focus-visible:outline-2 focus-visible:outline-accent"
      />
      <span className="card-tier tabular-nums">
        {card.title.length} / {CARD_TITLE_MAX_LENGTH} · rareté à la publication
      </span>
    </div>
  )
}

function StaticBand({ card }: { card: StackCardModel }) {
  return (
    <div className="card-band">
      <span className="card-name">{isBlankTitle(card) ? 'Sans titre' : card.title.trim()}</span>
      <span className="card-tier">Rareté calculée à la publication</span>
    </div>
  )
}

function DuplicateBand() {
  return (
    <div className="card-band">
      <span className="card-name">Doublon</span>
      <span className="card-tier">Ne deviendra pas une carte</span>
    </div>
  )
}

/** One card of the upload stack; only the top card is interactive. */
export function StackCard({
  card,
  role,
  elementRef,
  titleRef,
  isDragging = false,
  onTitleChange,
  onTitleEnter,
  onCrop,
}: StackCardProps) {
  const isTop = role === 'top'
  const isDuplicate = card.phase === 'duplicate'
  const canCrop =
    cardImageOf(card) !== null && !(card.phase === 'error' && !card.isRetryable)
  const band = isDuplicate ? (
    <DuplicateBand />
  ) : isTop ? (
    <TitleBand
      card={card}
      titleRef={titleRef}
      onTitleChange={onTitleChange}
      onTitleEnter={onTitleEnter}
    />
  ) : (
    <StaticBand card={card} />
  )

  return (
    <div
      ref={elementRef}
      inert={!isTop}
      aria-hidden={!isTop || undefined}
      data-stack-role={role}
      className={`relative [grid-area:1/1] select-none ${ROLE_CLASS[role]} ${isTop ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
    >
      <CardFace
        size="lg"
        title=""
        tier="common"
        isProvisional={false}
        band={band}
        className={`shadow-[0_0_0_2px_var(--tc),0_24px_40px_-18px_rgb(0_0_0/0.8)] ${isDuplicate ? '[--tc:var(--color-tier-legendary)]' : ''}`}
      >
        <StackCardArt card={card} sizes={SIZES} />
        {isDuplicate ? (
          <span className="absolute inset-0 z-[2] grid place-items-center bg-bg/60 p-2.5 text-center font-display text-[15px] font-bold text-tier-legendary">
            Déjà dans la ligue
          </span>
        ) : null}
      </CardFace>
      <UploadStatusBadge phase={card.phase} progress={card.progress} />
      {card.phase === 'sending' ? (
        <span className="absolute inset-x-0 top-0 z-[4] h-[3px] overflow-hidden rounded-t-[18px] bg-white/10">
          <span
            className="block h-full bg-cyan transition-[width] duration-200 ease-linear"
            style={{ width: `${Math.round(card.progress * 100)}%` }}
          />
        </span>
      ) : null}
      {isTop && !isDuplicate ? (
        <button
          type="button"
          aria-label="Recadrer la photo"
          disabled={!canCrop}
          onClick={onCrop}
          className="absolute top-2 right-2 z-[5] grid size-9 cursor-pointer place-items-center rounded-[10px] border-0 bg-bg/75 text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="crop" className="size-[18px]" />
        </button>
      ) : null}
    </div>
  )
}
