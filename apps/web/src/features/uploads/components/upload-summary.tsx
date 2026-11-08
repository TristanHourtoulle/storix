import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { Notice } from '@/components/ui/notice'
import { isBlankTitle, type StackCard } from '../session/session-reducer'
import { StackCardArt } from '../stack/stack-card-art'
import { plural } from '../upload-copy'
import { UploadStatusBadge } from './upload-status-badge'

export interface SummaryCounts {
  publishable: number
  missingTitles: number
  busy: number
  duplicates: number
  errors: number
}

interface UploadSummaryProps {
  cards: readonly StackCard[]
  counts: SummaryCounts
  notice: string | null
  isPublishing: boolean
  progress: { done: number; total: number }
  onBack: () => void
  onClose: () => void
  onSelect: (index: number) => void
  onPublish: () => void
}

/** The publish button label and whether it can be pressed, by priority (R20). */
function publishButtonState(counts: SummaryCounts): { label: string; canPublish: boolean } {
  if (counts.publishable === 0) return { label: 'Rien à publier', canPublish: false }
  if (counts.missingTitles > 0) {
    return {
      label: plural(counts.missingTitles, 'titre manquant', 'titres manquants'),
      canPublish: false,
    }
  }
  if (counts.busy > 0) {
    return {
      label: `Envoi en cours · ${plural(counts.busy, 'photo', 'photos')}`,
      canPublish: false,
    }
  }
  return { label: `Publier ${plural(counts.publishable, 'carte', 'cartes')}`, canPublish: true }
}

function countsLine(counts: SummaryCounts): string {
  return [
    counts.duplicates > 0 ? plural(counts.duplicates, 'doublon', 'doublons') : null,
    counts.errors > 0 ? plural(counts.errors, 'échec', 'échecs') : null,
  ]
    .filter((part) => part !== null)
    .map((part) => ` · ${part}`)
    .join('')
}

function errorNotice(errors: number): string {
  return errors > 1
    ? "Des photos n'ont pas pu être envoyées. Touche-les pour réessayer, sinon elles seront ignorées."
    : "Une photo n'a pas pu être envoyée. Touche-la pour réessayer, sinon elle sera ignorée."
}

function MiniCard({
  card,
  position,
  onSelect,
}: {
  card: StackCard
  position: number
  onSelect: () => void
}) {
  const isDuplicate = card.phase === 'duplicate'
  const isMissing = !isDuplicate && card.phase !== 'error' && isBlankTitle(card)
  const label = isBlankTitle(card) ? 'sans titre' : card.title.trim()
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={`Photo ${position}, ${label}`}
      className={`card md relative h-auto w-full cursor-pointer appearance-none border-0 p-0 text-left [aspect-ratio:63/88] ${isDuplicate ? '[--tc:var(--color-tier-legendary)]' : ''} ${card.phase === 'error' || isMissing ? '[--tc:var(--color-danger)]' : ''}`}
    >
      <span className="card-art">
        <StackCardArt card={card} sizes="120px" />
      </span>
      <UploadStatusBadge phase={card.phase} progress={card.progress} isCompact />
      {isDuplicate ? (
        <span className="absolute inset-0 z-[2] grid place-items-center bg-bg/60 font-display text-[11px] font-bold text-tier-legendary">
          Doublon
        </span>
      ) : null}
      <span className="card-band z-[3]">
        {isMissing ? (
          <span className="self-start rounded-md bg-danger/18 px-1.5 py-0.5 text-[10px] font-semibold text-danger">
            Titre manquant
          </span>
        ) : (
          <span className="card-name">{isBlankTitle(card) ? 'Sans titre' : card.title.trim()}</span>
        )}
      </span>
    </button>
  )
}

/** The publish summary: every card of the stack, its state, and the publish button (R20). */
export function UploadSummary({
  cards,
  counts,
  notice,
  isPublishing,
  progress,
  onBack,
  onClose,
  onSelect,
  onPublish,
}: UploadSummaryProps) {
  const button = publishButtonState(counts)
  return (
    <main className="screen">
      <header className="flex min-h-11 items-center justify-between gap-3">
        <button
          type="button"
          aria-label="Retour à l'édition"
          className="icon-btn"
          disabled={isPublishing}
          onClick={onBack}
        >
          <Icon name="back" className="size-5" />
        </button>
        <h1 className="m-0 font-display text-[15px] font-semibold text-ink-3">Récapitulatif</h1>
        <button type="button" aria-label="Fermer" className="icon-btn" onClick={onClose}>
          <Icon name="close" className="size-5" />
        </button>
      </header>
      <p className="m-0 text-sm text-ink-2">
        <b className="font-display font-semibold text-ink">
          {plural(counts.publishable, 'carte', 'cartes')}
        </b>
        {countsLine(counts)}
      </p>
      {notice ? <Notice tone="info">{notice}</Notice> : null}
      {counts.errors > 0 ? <Notice tone="error">{errorNotice(counts.errors)}</Notice> : null}
      {counts.missingTitles > 0 ? (
        <Notice tone="error">Touche une carte marquée en rouge pour lui donner un titre.</Notice>
      ) : null}
      <div
        className={`grid grid-cols-3 gap-2.5 ${isPublishing ? 'pointer-events-none opacity-55' : ''}`}
      >
        {cards.map((card, index) => (
          <MiniCard
            key={card.localId}
            card={card}
            position={index + 1}
            onSelect={() => onSelect(index)}
          />
        ))}
      </div>
      <div className="mt-auto flex flex-col gap-2 pt-2">
        <Button
          variant="primary"
          block
          sound="confirm"
          disabled={!button.canPublish || isPublishing}
          isLoading={isPublishing}
          onClick={onPublish}
        >
          {isPublishing ? `Publication… ${progress.done} / ${progress.total}` : button.label}
        </Button>
        <p className="m-0 text-center text-xs text-muted">
          Les cartes entrent dans les boosters à la publication.
        </p>
      </div>
    </main>
  )
}
