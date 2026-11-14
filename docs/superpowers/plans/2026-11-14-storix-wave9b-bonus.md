# Wave 9b plan: porte-bonheur bonuses

Spec: `docs/superpowers/specs/2026-11-14-storix-wave9b-bonus-design.md`.

1. Shared domain `charms.ts`: catalogue, prices, charges, weekly limit, purchase decision, weight deltas,
   foil odds, dust multiplier, boosted-pull rule. Tests.
2. `booster-draw.ts`: optional `charm` and `ownedCardIds`; per-slot weight deltas, collection redirect,
   foil odds; `isCharmBoosted` on each draw. Seeded distribution tests and fallbacks; no-charm draws stay
   byte-identical (existing tests unchanged).
3. Shared schemas: `charmIdSchema` (tolerant stored id), `walletState.charm`, `boosterOpening.charm`,
   `boosterPull.isCharmBoosted`, `feedRow.charm`, charm shop response and purchase body.
4. DB: schema columns, `charm_purchases`, migration 0024 + snapshot + journal.
5. API: wallets repository fields, `toWalletState`, boosters service (owned card ids, charm draw, Tamis
   dust, charge decrement, opening/pull columns, feed payload), charms feature (routes, service,
   repository), feed row mapping.
6. Web: shop families (Bonus replaces Sons & partage), `CharmShop` pane with slot ring and charm list,
   replace confirmation sheet, booster stage badge + odds + boosted dots + summary line, feed icon.
7. Release note card.
8. Gate: typecheck, lint, tests, build.
