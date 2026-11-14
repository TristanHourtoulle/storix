import { useState, type CSSProperties, type FormEvent } from 'react'
import {
  DEFAULT_EVENT_ICON,
  EVENT_ICONS,
  eventShortcuts,
  parisInstantFromLocal,
  SERIES_TITLE_MAX_LENGTH,
  seriesColorFor,
  toParisLocalInput,
  validateEventWindow,
  type EventIcon,
  type EventSummary,
  type EventWindow,
} from '@storix/shared'
import { BottomSheet } from '@/components/ui/bottom-sheet'
import { Button } from '@/components/ui/button'
import { Field } from '@/components/ui/field'
import { Icon } from '@/components/ui/icon'
import { Input } from '@/components/ui/input'
import { parisMoment, windowError } from '../event-copy'
import { seriesIconLabel } from '../series-copy'
import { useEventChange } from '../use-event-mutations'

interface EventSheetProps {
  leagueId: string
  open: boolean
  event?: EventSummary
  onClose: () => void
}

const STEPS = 3
const SHORTCUTS = [
  { key: 'tonight', label: 'Ce soir' },
  { key: 'tomorrowNoon', label: 'Demain midi' },
  { key: 'weekend', label: 'Ce week-end' },
] as const

type ShortcutKey = (typeof SHORTCUTS)[number]['key']

function isEventIcon(value: string): value is EventIcon {
  return (EVENT_ICONS as readonly string[]).includes(value)
}

function initialWindow(event: EventSummary | undefined): EventWindow {
  if (event !== undefined) {
    return { startsAt: new Date(event.startsAt), endsAt: new Date(event.endsAt) }
  }
  return eventShortcuts(new Date()).tomorrowNoon
}

/** Three-step sheet to schedule an event, or to edit one before it starts: name and icon, window, summary. */
export function EventSheet({ leagueId, open, event, onClose }: EventSheetProps) {
  const [step, setStep] = useState(0)
  const [title, setTitle] = useState(event?.title ?? '')
  const [icon, setIcon] = useState<EventIcon>(
    event !== undefined && isEventIcon(event.icon) ? event.icon : DEFAULT_EVENT_ICON,
  )
  const [slot, setSlot] = useState<EventWindow>(() => initialWindow(event))
  const [shortcut, setShortcut] = useState<ShortcutKey | null>(
    event === undefined ? 'tomorrowNoon' : null,
  )
  const [wasOpen, setWasOpen] = useState(open)
  const change = useEventChange(leagueId, onClose)
  const now = new Date()

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setStep(0)
      setTitle(event?.title ?? '')
      setIcon(event !== undefined && isEventIcon(event.icon) ? event.icon : DEFAULT_EVENT_ICON)
      setSlot(initialWindow(event))
      setShortcut(event === undefined ? 'tomorrowNoon' : null)
    }
  }

  const trimmed = title.trim()
  const error = windowError(validateEventWindow({ ...slot, now }))
  const canNext = step === 0 ? trimmed !== '' : step === 1 ? error === null : !change.isPending
  const color = seriesColorFor(trimmed === '' ? 'event' : trimmed)

  function pickShortcut(key: ShortcutKey): void {
    setShortcut(key)
    setSlot(eventShortcuts(new Date())[key])
  }

  function setBound(bound: keyof EventWindow, value: string): void {
    const instant = parisInstantFromLocal(value)
    if (instant === null) return
    setShortcut(null)
    setSlot((current) => ({ ...current, [bound]: instant }))
  }

  function submit(formEvent: FormEvent): void {
    formEvent.preventDefault()
    if (!canNext) return
    if (step < STEPS - 1) {
      setStep(step + 1)
      return
    }
    const submittedAt = new Date()
    const finalSlot = shortcut === null ? slot : eventShortcuts(submittedAt)[shortcut]
    if (validateEventWindow({ ...finalSlot, now: submittedAt }) !== 'ok') {
      setSlot(finalSlot)
      setStep(1)
      return
    }
    const body = {
      title: trimmed,
      icon,
      startsAt: finalSlot.startsAt.toISOString(),
      endsAt: finalSlot.endsAt.toISOString(),
    }
    change.mutate(
      event === undefined
        ? { type: 'create', body }
        : { type: 'update', seriesId: event.id, patch: body },
    )
  }

  return (
    <BottomSheet
      open={open}
      title={event === undefined ? 'Programmer un événement' : 'Modifier l’événement'}
      onClose={onClose}
    >
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <div className="event-steps-top">
          <button
            type="button"
            className="event-steps-back"
            onClick={() => (step === 0 ? onClose() : setStep(step - 1))}
          >
            {step === 0 ? 'Fermer' : '‹ Retour'}
          </button>
          <span className="text-xs text-muted" aria-live="polite">
            Étape {step + 1} / {STEPS}
          </span>
        </div>
        <div className="event-steps" aria-hidden="true">
          {Array.from({ length: STEPS }, (_, index) => (
            <i key={index} className={index <= step ? 'is-on' : undefined} />
          ))}
        </div>
        <div key={step} className="event-step">
          {step === 0 ? (
            <>
              <Field label="Nom">
                <Input
                  value={title}
                  maxLength={SERIES_TITLE_MAX_LENGTH}
                  placeholder="Repas de famille"
                  autoFocus
                  onChange={(changeEvent) => setTitle(changeEvent.target.value)}
                />
              </Field>
              <div className="flex flex-col gap-2">
                <span className="text-xs tracking-[0.06em] text-muted uppercase">Icône</span>
                <div className="event-icons" role="radiogroup" aria-label="Icône de l’événement">
                  {EVENT_ICONS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={key === icon}
                      aria-label={seriesIconLabel(key)}
                      className="series-icon-pick"
                      onClick={() => setIcon(key)}
                    >
                      <Icon name={key} className="size-5" />
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : null}
          {step === 1 ? (
            <>
              <div className="flex flex-col gap-2">
                <span className="text-xs tracking-[0.06em] text-muted uppercase">Raccourcis</span>
                <div className="event-quick">
                  {SHORTCUTS.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      className="series-idea"
                      aria-pressed={shortcut === item.key}
                      onClick={() => pickShortcut(item.key)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="event-when">
                <Field label="Début">
                  <Input
                    type="datetime-local"
                    value={toParisLocalInput(slot.startsAt)}
                    onChange={(changeEvent) => setBound('startsAt', changeEvent.target.value)}
                  />
                </Field>
                <Field label="Fin">
                  <Input
                    type="datetime-local"
                    value={toParisLocalInput(slot.endsAt)}
                    onChange={(changeEvent) => setBound('endsAt', changeEvent.target.value)}
                  />
                </Field>
              </div>
              {error === null ? (
                <p className="text-xs text-muted">Heure de Paris · de 30 min à 48 h.</p>
              ) : (
                <p className="text-xs text-danger" role="alert">
                  {error}
                </p>
              )}
            </>
          ) : null}
          {step === 2 ? (
            <>
              <div className="event-sum" style={{ '--sc': color } as CSSProperties}>
                <span className="event-sum-ic">
                  <Icon name={icon} className="size-7" />
                </span>
                <b>{trimmed}</b>
                <span>
                  {parisMoment(slot.startsAt, now)} → {parisMoment(slot.endsAt, now)}
                </span>
                <span>
                  Notification à tous au début · 12 h pour ajouter des photos après la fin
                </span>
              </div>
              <p className="text-xs text-muted">
                Tu pourras le modifier ou l’annuler avant le début.
              </p>
            </>
          ) : null}
        </div>
        <div className="bsheet-footer">
          <Button
            type="submit"
            variant="primary"
            block
            disabled={!canNext}
            isLoading={change.isPending}
          >
            {step < STEPS - 1
              ? 'Suivant'
              : event === undefined
                ? 'Créer l’événement'
                : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </BottomSheet>
  )
}
