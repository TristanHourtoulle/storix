import { describe, expect, it } from 'vitest'
import { releaseNoteSchema } from '../schemas/whats-new'
import { RELEASE_NOTES } from './catalog'

describe('RELEASE_NOTES', () => {
  it('should be valid, uniquely identified and sorted newest first', () => {
    const ids = RELEASE_NOTES.map((release) => release.id)
    const times = RELEASE_NOTES.map((release) => new Date(release.publishedAt).getTime())

    for (const release of RELEASE_NOTES) {
      expect(releaseNoteSchema.safeParse(release).success).toBe(true)
      expect(new Set(release.cards.map((card) => card.key)).size).toBe(release.cards.length)
    }
    expect(new Set(ids).size).toBe(ids.length)
    expect(times).toEqual(times.toSorted((a, b) => b - a))
  })
})
