import { MAX_TAGGED_USERS, type MemberSummary, type SeriesSummary } from '@storix/shared'
import type { CSSProperties } from 'react'
import { Icon } from '@/components/ui/icon'
import { INVALID_IMAGE_MESSAGE } from '../upload-pipeline'
import { MemberTagChips } from '../components/member-tag-chips'
import type { StackCard } from '../session/session-reducer'

interface StackFieldsProps {
  card: StackCard
  previous: StackCard | null
  members: readonly MemberSummary[]
  openSeries: readonly SeriesSummary[]
  onToggleSeries: (seriesId: string) => void
  onToggleTag: (userId: string) => void
  onCopyPreviousTags: () => void
  onRetry: () => void
}

const dateFormat = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' })

function captureLine(capturedAt: string | null): string {
  return capturedAt
    ? `Prise le ${dateFormat.format(new Date(capturedAt))}`
    : 'Date de prise inconnue'
}

function seriesName(series: SeriesSummary): string {
  return series.kind === 'theme' ? `Thème · ${series.title}` : series.title
}

function SeriesToggles({
  card,
  openSeries,
  onToggleSeries,
}: Pick<StackFieldsProps, 'card' | 'openSeries' | 'onToggleSeries'>) {
  if (openSeries.length === 0) return null
  return (
    <section className="flex flex-col gap-2">
      <span className="text-[11px] font-medium tracking-[0.06em] text-muted uppercase">Séries</span>
      {openSeries.map((series) => {
        const isOn = card.seriesIds.includes(series.id)
        return (
          <button
            key={series.id}
            type="button"
            role="switch"
            className="series-toggle"
            aria-checked={isOn}
            aria-label={seriesName(series)}
            style={{ '--sc': series.color } as CSSProperties}
            onClick={() => onToggleSeries(series.id)}
          >
            <span className="series-toggle-em" aria-hidden="true">
              {series.emoji}
            </span>
            <span className="series-toggle-tx" aria-hidden="true">
              <b>{seriesName(series)}</b>
              <small>
                {isOn
                  ? 'La photo entre dans la série'
                  : series.kind === 'theme'
                    ? 'Hors thème'
                    : 'Hors série'}
              </small>
            </span>
            <span className="series-switch" aria-hidden="true" />
          </button>
        )
      })}
    </section>
  )
}

function sameTagSet(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id))
}

function ErrorNotice({ card, onRetry }: Pick<StackFieldsProps, 'card' | 'onRetry'>) {
  if (!card.isRetryable) {
    return (
      <div role="alert" className="rounded-input bg-danger/12 px-3 py-2.5 text-[13px] text-red-200">
        {card.errorMessage ?? INVALID_IMAGE_MESSAGE}
      </div>
    )
  }
  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-2.5 rounded-input bg-danger/12 px-3 py-2.5 text-[13px] text-red-200"
    >
      <span>
        <b className="font-semibold">L&apos;envoi a échoué.</b> Ton titre est gardé, relance
        l&apos;envoi.
      </span>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex h-9 flex-none cursor-pointer items-center gap-1.5 rounded-control border-0 bg-transparent px-3 font-display text-[13px] font-semibold text-ink shadow-hairline-strong"
      >
        <Icon name="retry" className="size-4" />
        Réessayer
      </button>
    </div>
  )
}

/** The fields under the top card: notices, people on the photo and the photo facts (R18, R19). */
export function StackFields({
  card,
  previous,
  members,
  openSeries,
  onToggleSeries,
  onToggleTag,
  onCopyPreviousTags,
  onRetry,
}: StackFieldsProps) {
  if (card.phase === 'duplicate') {
    return (
      <div
        role="status"
        className="rounded-input bg-tier-legendary/12 px-3 py-2.5 text-[13px] text-amber-200"
      >
        <b className="font-semibold">Cette photo est déjà dans la ligue.</b> Elle ne deviendra pas
        une carte. Retire-la pour continuer.
      </div>
    )
  }
  const canCopy =
    previous !== null &&
    previous.taggedUserIds.length > 0 &&
    !sameTagSet(previous.taggedUserIds, card.taggedUserIds)
  const isFull = card.taggedUserIds.length >= MAX_TAGGED_USERS

  return (
    <div className="flex flex-col gap-4">
      {card.phase === 'error' ? <ErrorNotice card={card} onRetry={onRetry} /> : null}
      <section className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-[11px] font-medium tracking-[0.06em] text-muted uppercase">
            Qui est sur la photo ?
          </span>
          {canCopy ? (
            <button
              type="button"
              onClick={onCopyPreviousTags}
              className="cursor-pointer border-0 bg-transparent p-0 text-right font-sans text-xs font-medium text-accent-hover"
            >
              Mêmes personnes que la photo précédente
            </button>
          ) : null}
        </div>
        <MemberTagChips
          members={members}
          selectedIds={card.taggedUserIds}
          isDisabled={false}
          onToggle={(userId) => {
            if (isFull && !card.taggedUserIds.includes(userId)) return
            onToggleTag(userId)
          }}
        />
      </section>
      <SeriesToggles card={card} openSeries={openSeries} onToggleSeries={onToggleSeries} />
      <div className="flex flex-col gap-2 text-[13px] text-ink-3">
        <p className="m-0 flex items-center gap-2.5">
          <Icon name="calendar" className="size-[17px] text-muted" />
          {captureLine(card.capturedAt)}
        </p>
        <p className="m-0 flex items-center gap-2.5">
          <Icon name="shield" className="size-[17px] text-muted" />
          Position GPS supprimée avant l&apos;envoi
        </p>
      </div>
    </div>
  )
}
