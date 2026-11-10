import type { ReleaseNote } from '../schemas/whats-new'

/** Every feature release shown in the "Nouveautés" booster, newest first. */
export const RELEASE_NOTES: readonly ReleaseNote[] = [
  {
    id: '2026-11-10',
    publishedAt: '2026-11-10T18:00:00+01:00',
    cards: [
      {
        key: 'premium',
        title: 'Un booster premium sur 20',
        body: "Tous les 20 boosters, un premium doré : 5e carte Légendaire garantie, avec 15 % de chances de Mythique. La jauge de l'accueil te dit quand.",
        tier: 'legendary',
        illustration: 'premium',
        tryTarget: 'home',
      },
      {
        key: 'mythic',
        title: 'Les Mythiques arrivent',
        body: 'Dès 50 cartes, la meilleure de ta ligue devient Mythique, puis une de plus tous les 100. Toutes les chances sont dans « Probabilités ».',
        tier: 'mythic',
        illustration: 'mythic',
        tryTarget: 'home',
      },
      {
        key: 'upgradable',
        title: 'Filtre « À améliorer »',
        body: "Dans Filtres, retrouve d'un coup les cartes à ×10 que tes paillettes peuvent déjà faire monter.",
        tier: 'uncommon',
        illustration: 'upgrade',
        tryTarget: 'collection-upgradable',
      },
    ],
  },
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
