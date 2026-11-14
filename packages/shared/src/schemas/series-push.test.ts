import { describe, expect, it } from 'vitest'
import { pushPayloadSchema } from './push'
import { eventEndPayload, eventStartPayload } from './series-push'

const event = {
  id: '8de84d07-74e2-48ed-a60b-5ea6aac1a3b2',
  leagueId: 'a236429a-a63a-4bf2-bbfa-228a9080c9af',
  title: 'Soirée de Léa',
}

describe('event push payloads', () => {
  it('should build a deliverable start push for the league home', () => {
    const payload = eventStartPayload({ ...event, endsAt: new Date('2026-11-15T01:00:00Z') })
    expect(payload.tag).toBe(`event:${event.id}`)
    expect(payload.url).toBe(`/l/${event.leagueId}`)
    expect(payload.body).toContain("d'ici 2:00")
  })

  it('should build a deliverable end push opening the series page', () => {
    const payload = eventEndPayload(event, 23)
    expect(payload.tag).toBe(`event-end:${event.id}`)
    expect(payload.url).toBe(`/l/${event.leagueId}/series/${event.id}`)
    expect(payload.body).toContain('23 cartes')
  })

  it('should still refuse a url outside the league pages', () => {
    const base = { v: 1, title: 'Storix', body: 'x', tag: `moment:${event.leagueId}` }
    expect(pushPayloadSchema.safeParse({ ...base, url: 'https://evil.test' }).success).toBe(false)
    expect(
      pushPayloadSchema.safeParse({ ...base, url: `/l/${event.leagueId}/cards` }).success,
    ).toBe(false)
  })
})
