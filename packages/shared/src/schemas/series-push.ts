import { pushPayloadSchema, type PushPayload } from './push'

const NOTIFICATION_TITLE = 'Storix'
const PARIS_TIME = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  hour: 'numeric',
  minute: '2-digit',
})

interface EventRef {
  id: string
  leagueId: string
  title: string
}

/** The push announcing an event start to the whole league; throws when it would not be deliverable. */
export function eventStartPayload(event: EventRef & { endsAt: Date }): PushPayload {
  return pushPayloadSchema.parse({
    v: 1,
    title: NOTIFICATION_TITLE,
    body: `${event.title} commence ! Les photos d'ici ${PARIS_TIME.format(event.endsAt)} vont dans sa série.`,
    url: `/l/${event.leagueId}`,
    tag: `event:${event.id}`,
  })
}

/** The push telling contributors an event is over; throws when it would not be deliverable. */
export function eventEndPayload(event: EventRef, cardCount: number): PushPayload {
  const cards = `${cardCount} carte${cardCount > 1 ? 's' : ''}`
  return pushPayloadSchema.parse({
    v: 1,
    title: NOTIFICATION_TITLE,
    body: `${event.title}, c'est fini : ${cards} à trouver dans les boosters.`,
    url: `/l/${event.leagueId}/series/${event.id}`,
    tag: `event-end:${event.id}`,
  })
}
