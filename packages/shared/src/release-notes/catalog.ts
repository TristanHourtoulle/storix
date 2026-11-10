import type { ReleaseNote } from '../schemas/whats-new'

/** Every feature release shown in the "Nouveautés" booster, newest first. */
export const RELEASE_NOTES: readonly ReleaseNote[] = [
  {
    id: '2026-11-09',
    publishedAt: '2026-11-09T18:00:00+01:00',
    cards: [
      {
        key: 'camera',
        title: 'Un « + » tout neuf',
        body: "Le bouton + ouvre directement l'appareil photo, avec un viseur au format carte. Cadre, déclenche, c'est prêt.",
        tier: 'legendary',
        illustration: 'camera',
        tryTarget: 'add',
      },
      {
        key: 'stacks',
        title: "Tes doublons s'empilent",
        body: "Tes doublons ne partent plus en paillettes : ils s'empilent sur la carte. À ×10, ta copie peut monter d'une rareté, rien que pour toi.",
        tier: 'epic',
        illustration: 'stacks',
        tryTarget: 'stack-card',
      },
      {
        key: 'showcase',
        title: 'Tes cartes, en grand',
        body: 'Chaque carte a sa vitrine, en plein écran avec sa progression. Après un booster, la loupe te montre chaque tirage de près.',
        tier: 'rare',
        illustration: 'showcase',
        tryTarget: 'showcase-card',
      },
      {
        key: 'share',
        title: 'Partage en 3 styles',
        body: 'Carte, Flex ou Booster : crée une image prête à envoyer, avec le vrai logo Storix.',
        tier: 'mythic',
        illustration: 'share',
        tryTarget: 'showcase-card',
      },
      {
        key: 'sort',
        title: 'Trie ta collection',
        body: "Par rareté, découverte ou numéro, et repère d'un coup d'œil les cartes ✦ NEW.",
        tier: 'uncommon',
        illustration: 'sort',
        tryTarget: 'collection-discovery',
      },
    ],
  },
]
