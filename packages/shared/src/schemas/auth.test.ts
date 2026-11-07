import { describe, expect, it } from 'vitest'
import { displayNameSchema } from './auth'

describe('display name', () => {
  it('accepts letters with accents, digits, spaces and ._-', () => {
    for (const name of ['Zoé', 'Jean-Éric 2', 'a.b_c', 'Ça va', 'Lu']) {
      expect(displayNameSchema.safeParse(name).success).toBe(true)
    }
  })
  it('trims surrounding spaces', () => {
    expect(displayNameSchema.parse('  Zoé  ')).toBe('Zoé')
  })
  it('rejects names outside 2 to 24 characters or with other symbols', () => {
    for (const name of [
      'a',
      ' a ',
      'x'.repeat(25),
      'Zoé!',
      '<b>',
      'emoji 🎉',
      '   ',
      'tab\tname',
    ]) {
      expect(displayNameSchema.safeParse(name).success).toBe(false)
    }
  })
})
