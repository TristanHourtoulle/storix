import { describe, expect, it } from 'vitest'
import type { CardTier } from './cards'
import {
  boosterContextLine,
  packSubline,
  shareBadges,
  shareBanner,
  shareFileName,
  shareText,
  type BoosterShareOrigin,
  type ShareCardFacts,
} from './share-copy'

function facts(tier: CardTier, tierLabel: string, isFoil = false): ShareCardFacts {
  return { title: 'Carte', tier, tierLabel, isFoil }
}

function booster(overrides: Partial<BoosterShareOrigin>): BoosterShareOrigin {
  return {
    kind: 'booster',
    isFirstCopy: false,
    isDiscovery: false,
    position: 2,
    total: 5,
    isBest: false,
    openedAt: '2026-11-09T12:00:00.000Z',
    ...overrides,
  }
}

describe('share copy', () => {
  it('derives the booster banner by priority', () => {
    expect(
      shareBanner(facts('legendary', 'Légendaire', true), booster({ isDiscovery: true })),
    ).toBe('Tirée en Légendaire !')
    expect(shareBanner(facts('epic', 'Épique'), booster({}))).toBe('Tirée en Épique !')
    expect(shareBanner(facts('rare', 'Rare', true), booster({ isFirstCopy: true }))).toBe(
      'Tirée en foil !',
    )
    expect(shareBanner(facts('rare', 'Rare'), booster({ isFirstCopy: true }))).toBe(
      'Nouvelle découverte !',
    )
    expect(shareBanner(facts('common', 'Commune'), booster({ isDiscovery: true }))).toBe(
      'Nouvelle découverte !',
    )
    expect(shareBanner(facts('uncommon', 'Peu commune'), booster({}))).toBe(
      'Tirée dans mon booster',
    )
  })

  it('derives the collection banner by priority', () => {
    const mine = { kind: 'collection', isDiscoveredByMe: true } as const
    const other = { kind: 'collection', isDiscoveredByMe: false } as const
    expect(shareBanner(facts('mythic', 'Mythique'), mine)).toBe('Ma carte Mythique !')
    expect(shareBanner(facts('rare', 'Rare', true), mine)).toBe('Ma carte foil !')
    expect(shareBanner(facts('rare', 'Rare'), mine)).toBe('Découverte par moi !')
    expect(shareBanner(facts('rare', 'Rare'), other)).toBe('Dans ma collection')
  })

  it('lists badges', () => {
    expect(
      shareBadges(facts('rare', 'Rare', true), booster({ isDiscovery: true, isFirstCopy: true })),
    ).toEqual([
      { label: 'Découverte par moi', tone: 'new' },
      { label: 'Foil', tone: 'foil' },
    ])
    expect(shareBadges(facts('rare', 'Rare'), booster({ isFirstCopy: true }))).toEqual([
      { label: 'Nouvelle', tone: 'new' },
    ])
    expect(shareBadges(facts('rare', 'Rare'), booster({}))).toEqual([])
    expect(
      shareBadges(facts('rare', 'Rare', true), { kind: 'collection', isDiscoveredByMe: false }),
    ).toEqual([{ label: 'Foil', tone: 'foil' }])
  })

  it('writes the booster context line', () => {
    expect(boosterContextLine(booster({ isBest: true, position: 1 }))).toBe(
      'Booster du 9 nov. · meilleure prise sur 5',
    )
    expect(boosterContextLine(booster({}))).toBe('Booster du 9 nov. · carte 2 sur 5')
    expect(boosterContextLine(booster({ total: 1, position: 1, isBest: true }))).toBe(
      'Booster du 9 nov.',
    )
  })

  it('writes the pack subline', () => {
    expect(packSubline(5, 'Légendaire')).toBe('5 cartes · meilleure prise en Légendaire')
    expect(packSubline(1, 'Rare')).toBe('1 carte · meilleure prise en Rare')
  })

  it('writes the share text', () => {
    expect(
      shareText({ ...facts('legendary', 'Légendaire'), title: 'Coucher de soleil' }, booster({})),
    ).toBe("J'ai tiré « Coucher de soleil » en Légendaire sur Storix !")
    expect(
      shareText(
        { ...facts('rare', 'Rare'), title: 'Ski' },
        { kind: 'collection', isDiscoveredByMe: false },
      ),
    ).toBe('Regarde ma carte « Ski » en Rare sur Storix !')
  })

  it('slugs the file name', () => {
    expect(shareFileName('Coucher de soleil à Égine !')).toBe(
      'storix-coucher-de-soleil-a-egine.png',
    )
    expect(shareFileName('!!!')).toBe('storix-carte.png')
    expect(shareFileName('a'.repeat(60))).toBe(`storix-${'a'.repeat(40)}.png`)
    expect(shareFileName('ab cd '.repeat(10))).not.toMatch(/-\.png$/)
  })
})
