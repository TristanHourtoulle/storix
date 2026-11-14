import { describe, expect, it } from 'vitest'
import { COSMETIC_ITEMS } from './cosmetic-catalog'
import {
  canEquip,
  cosmeticsOfSlot,
  findCosmetic,
  pickTryOnCards,
  purchaseDecision,
} from './cosmetics'

const neonSet = findCosmetic('rarity-neon')

describe('cosmetics catalogue', () => {
  it('has unique ids and lists a slot in display order', () => {
    expect(new Set(COSMETIC_ITEMS.map((item) => item.id)).size).toBe(COSMETIC_ITEMS.length)
    expect(cosmeticsOfSlot('booster').map((item) => item.id)).toEqual([
      'booster-neon',
      'booster-or-noir',
      'booster-aquarelle',
      'booster-cosmos',
      'booster-vitrail',
    ])
    expect(cosmeticsOfSlot('openingTear').map((item) => item.id)).toEqual([
      'tear-braises',
      'tear-verre',
      'tear-ruban',
    ])
    expect(findCosmetic('nope')).toBeUndefined()
  })

  it('prices items individually where the slot default does not apply', () => {
    expect(findCosmetic('banner-constellation')?.price).toBe(400)
    expect(findCosmetic('banner-pellicule')?.price).toBe(500)
    expect(findCosmetic('name-or')?.price).toBe(900)
    expect(findCosmetic('name-surligneur')?.price).toBe(600)
    expect(findCosmetic('stamp-encre')?.price).toBe(400)
    expect(findCosmetic('tear-verre')?.price).toBe(1200)
    expect(findCosmetic('rarity-vitrail')?.price).toBe(2500)
  })

  it('marks what the league sees as league-visible', () => {
    const visibility = (id: string) => findCosmetic(id)?.visibility
    expect(visibility('frame-neon')).toBe('league')
    expect(visibility('banner-aurore')).toBe('league')
    expect(visibility('name-holo')).toBe('league')
    expect(visibility('stamp-ticket')).toBe('league')
    expect(visibility('back-neon')).toBe('self')
    expect(visibility('tear-ruban')).toBe('self')
  })
})

describe('purchaseDecision', () => {
  it('rejects an owned item before checking the balance', () => {
    if (neonSet === undefined) throw new Error('missing item')
    expect(purchaseDecision({ item: neonSet, owned: ['rarity-neon'], dust: 0 })).toBe(
      'already_owned',
    )
  })

  it('requires the exact price or more', () => {
    if (neonSet === undefined) throw new Error('missing item')
    expect(purchaseDecision({ item: neonSet, owned: [], dust: 2499 })).toBe('insufficient_dust')
    expect(purchaseDecision({ item: neonSet, owned: [], dust: 2500 })).toBe('ok')
  })
})

describe('canEquip', () => {
  it('allows the default, refuses unowned or wrong-slot items', () => {
    expect(canEquip({ slot: 'raritySet', itemId: null, owned: [] })).toBe(true)
    expect(canEquip({ slot: 'raritySet', itemId: 'rarity-neon', owned: [] })).toBe(false)
    expect(canEquip({ slot: 'cardBack', itemId: 'rarity-neon', owned: ['rarity-neon'] })).toBe(
      false,
    )
    expect(canEquip({ slot: 'raritySet', itemId: 'rarity-neon', owned: ['rarity-neon'] })).toBe(
      true,
    )
  })
})

describe('pickTryOnCards', () => {
  it('takes one per tier first, then fills in tier order without duplicates', () => {
    const cards = [
      { id: 'r1', tier: 'rare' as const },
      { id: 'c1', tier: 'common' as const },
      { id: 'c2', tier: 'common' as const },
      { id: 'c3', tier: 'common' as const },
      { id: 'l1', tier: 'legendary' as const },
      { id: 'r2', tier: 'rare' as const },
      { id: 'c4', tier: 'common' as const },
    ]
    expect(pickTryOnCards(cards).map((card) => card.id)).toEqual([
      'c1',
      'r1',
      'l1',
      'c2',
      'c3',
      'c4',
    ])
    expect(pickTryOnCards([])).toEqual([])
  })
})
