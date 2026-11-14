import type { CSSProperties } from 'react'
import { acceptsPhoto, type SeriesSummary } from '@storix/shared'
import { Icon } from '@/components/ui/icon'

interface SeriesTogglesProps {
  seriesIds: readonly string[]
  capturedAt: string | null
  openSeries: readonly SeriesSummary[]
  onToggle: (seriesId: string) => void
}

function seriesName(series: SeriesSummary): string {
  return series.kind === 'theme' ? `Thème · ${series.title}` : series.title
}

function takesPhoto(series: SeriesSummary, capturedAt: Date, now: Date): boolean {
  return acceptsPhoto(
    {
      kind: series.kind,
      startsAt: new Date(series.startsAt),
      endsAt: new Date(series.endsAt),
      graceEndsAt: new Date(series.graceEndsAt),
      closedAt: null,
    },
    { capturedAt, sentAt: now },
  )
}

function hint(series: SeriesSummary, isOn: boolean): string {
  if (series.kind === 'theme') return isOn ? 'La photo entre dans la série' : 'Hors thème'
  return isOn ? 'Prise pendant l’événement' : 'Hors événement'
}

/** One switch per open series that takes this photo: the theme, and the events it was taken during. */
export function SeriesToggles({ seriesIds, capturedAt, openSeries, onToggle }: SeriesTogglesProps) {
  const now = new Date()
  const taken = capturedAt === null ? now : new Date(capturedAt)
  const offered = openSeries.filter((series) => takesPhoto(series, taken, now))
  if (offered.length === 0) return null
  return (
    <section className="flex flex-col gap-2">
      <span className="text-[11px] font-medium tracking-[0.06em] text-muted uppercase">Séries</span>
      {offered.map((series) => {
        const isOn = seriesIds.includes(series.id)
        return (
          <button
            key={series.id}
            type="button"
            role="switch"
            className="series-toggle"
            aria-checked={isOn}
            aria-label={seriesName(series)}
            style={{ '--sc': series.color } as CSSProperties}
            onClick={() => onToggle(series.id)}
          >
            <span className="series-toggle-em">
              <Icon name={series.icon} className="size-5" />
            </span>
            <span className="series-toggle-tx" aria-hidden="true">
              <b>{seriesName(series)}</b>
              <small>{hint(series, isOn)}</small>
            </span>
            <span className="series-switch" aria-hidden="true" />
          </button>
        )
      })}
    </section>
  )
}
