import { useState, type CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { EventSummary } from '@storix/shared'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Icon } from '@/components/ui/icon'
import { parisMoment, untilLabel } from '../event-copy'
import { eventsQueryOptions } from '../series.queries'
import { useEventChange } from '../use-event-mutations'
import { EventSheet } from './event-sheet'

interface LeagueEventsProps {
  leagueId: string
}

type Confirm = { kind: 'cancel' | 'end'; event: EventSummary }

const CONFIRM_COPY = {
  cancel: {
    title: 'Annuler l’événement ?',
    body: 'Il disparaît pour toute la ligue.',
    action: 'Annuler l’événement',
  },
  end: {
    title: 'Terminer maintenant ?',
    body: 'Les photos prises jusqu’ici pourront encore être ajoutées pendant 12 h.',
    action: 'Terminer',
  },
} as const

function whenLabel(event: EventSummary, now: Date): string {
  if (event.phase === 'live') return `En direct · ${untilLabel(new Date(event.endsAt))}`
  return `${parisMoment(new Date(event.startsAt), now)} → ${parisMoment(new Date(event.endsAt), now)}`
}

/** Ligue page block listing the live and upcoming events, with scheduling and the creator's actions. */
export function LeagueEvents({ leagueId }: LeagueEventsProps) {
  const { data } = useQuery(eventsQueryOptions(leagueId))
  const [isCreating, setIsCreating] = useState(false)
  const [editing, setEditing] = useState<EventSummary | null>(null)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const change = useEventChange(leagueId, () => setIsConfirmOpen(false))

  function ask(next: Confirm): void {
    setConfirm(next)
    setIsConfirmOpen(true)
  }
  const now = new Date()
  const events = [...(data?.live ?? []), ...(data?.upcoming ?? [])]

  return (
    <section className="league-events" aria-label="Événements">
      <div className="league-events-head">
        <h2>Événements</h2>
        <button type="button" className="series-next-btn" onClick={() => setIsCreating(true)}>
          ＋ Programmer un événement
        </button>
      </div>
      {events.map((event) => (
        <div
          key={event.id}
          className="league-event"
          style={{ '--sc': event.color } as CSSProperties}
        >
          {event.phase === 'live' ? (
            <Link to="/l/$leagueId/series/$seriesId" params={{ leagueId, seriesId: event.id }}>
              <span className="series-toggle-em">
                <Icon name={event.icon} className="size-5" />
              </span>
              <span className="league-event-tx">
                <b>{event.title}</b>
                <small>{whenLabel(event, now)}</small>
              </span>
            </Link>
          ) : (
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="series-toggle-em">
                <Icon name={event.icon} className="size-5" />
              </span>
              <span className="league-event-tx">
                <b>{event.title}</b>
                <small>{whenLabel(event, now)}</small>
              </span>
            </div>
          )}
          {event.canManage ? (
            <span className="league-event-actions">
              {event.phase === 'upcoming' ? (
                <>
                  <button
                    type="button"
                    className="series-next-btn"
                    onClick={() => setEditing(event)}
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    className="series-next-btn"
                    onClick={() => ask({ kind: 'cancel', event })}
                  >
                    Annuler
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="series-next-btn"
                  onClick={() => ask({ kind: 'end', event })}
                >
                  Terminer
                </button>
              )}
            </span>
          ) : null}
        </div>
      ))}
      <EventSheet leagueId={leagueId} open={isCreating} onClose={() => setIsCreating(false)} />
      {editing !== null ? (
        <EventSheet
          key={editing.id}
          leagueId={leagueId}
          open
          event={editing}
          onClose={() => setEditing(null)}
        />
      ) : null}
      <BottomSheet
        open={isConfirmOpen}
        title={confirm === null ? '' : CONFIRM_COPY[confirm.kind].title}
        onClose={() => setIsConfirmOpen(false)}
      >
        <p className="m-0 text-sm text-ink-2">
          {confirm === null ? '' : CONFIRM_COPY[confirm.kind].body}
        </p>
        <div className="bsheet-footer">
          <Button
            variant="primary"
            block
            isLoading={change.isPending}
            onClick={() => {
              if (confirm === null) return
              change.mutate({ type: confirm.kind, seriesId: confirm.event.id })
            }}
          >
            {confirm === null ? '' : CONFIRM_COPY[confirm.kind].action}
          </Button>
        </div>
      </BottomSheet>
    </section>
  )
}
