# Storix wave 9b: porte-bonheur bonuses

Date: 2026-11-14. Source design: Ligue & Bonus artifact (part 2, model C). Scope frozen by the user:
"Partie 2 : go pour le C, par contre plus cher sinon c'est trop simple. Et ok pour enlever son et
partages car pas encore fait !"

## Model

- One porte-bonheur slot per member and league (the paillettes wallet is per league).
- Buying a charm fills the slot with 10 charges. Each booster opened (timer, bonus or premium gift,
  standard or premium) spends one charge. At 0 the slot empties.
- Only one charm is active, so Trèfle / Trèfle d'or and Boussole / Aimant can never be combined.
- Buying the active charm again is refused (`CHARM_ALREADY_ACTIVE`).
- Buying another charm while one is active replaces it: the remaining charges are lost. The client must
  send `replace: true` after a confirmation, otherwise `CHARM_ACTIVE` (409).
- Weekly cap: 3 charm purchases per member and league over a rolling 7 days (`CHARM_WEEKLY_LIMIT`).
- No extra boosters and no premium shortcut are sold.
- Rankings and trophies count everything the same, bonus or not.

## Catalogue and odds

Weights are integer basis points (×100) only when a chance charm is active, so a draw without a charm
consumes the exact same random numbers as before.

| Charm | Effect | Standard rare+ slot | Premium last slot |
|---|---|---|---|
| Trèfle | Mythique et Légendaire +25 % | Légendaire 7 → 8,75 %, Mythique 1 → 1,25 % (taken from Rare, then Épique) | Mythique 15 → 18,75 % |
| Trèfle d'or | Mythique ×2 | Légendaire 7 → 9 %, Mythique 1 → 2 % | Mythique 15 → 25 % |
| Boussole | Nouvelle carte +25 % | per card, 1 chance in 4 to pick among unowned cards of the rolled tier | same |
| Aimant | Doublon +25 % | per card, 1 chance in 4 to pick among owned cards of the rolled tier | same |
| Éclat | Brillante +25 % | foil 1 in 15 → 1 in 12 per card | same |
| Tamis | Paillettes +25 % | duplicate dust × 1,25 (rounded) | same |

- Pity still applies first, then the charm deltas. The deltas move weight from Rare, then Épique.
- Mythic only exists from 50 cards in a league. Without a Mythic the draw falls back to Légendaire as
  today, and the shop says so on the Trèfle cards.
- Boussole / Aimant: the redirect only counts as "boosted" when it actually narrowed the choice (some
  cards of the tier were excluded and at least one candidate remained). Otherwise the normal pick runs.
- RNG order per slot: tier, [collection charm roll], author, card, foil.

## Prices ("plus cher, sinon c'est trop simple")

Typical earnings: about 120 ✦ a day in daily missions plus about 560 ✦ a week, so about 1 400 ✦ a week.
A booster made only of duplicates is worth about 115 ✦.

| Charm | Artifact | Final | Rationale |
|---|---|---|---|
| Tamis | 300 | 1 500 | about a week; it earns back only a fraction, it is a collector's luxury |
| Aimant | 300 | 1 500 | about a week; feeds stacks and upgrades |
| Éclat | 400 | 1 800 | a week and a bit; foils are cosmetic and double dust |
| Boussole | 600 | 2 000 | strongest collection booster, about 1,5 week |
| Trèfle | 500 | 2 000 | about 1,5 week for +25 % on Légendaire / Mythique |
| Trèfle d'or | 1 200 | 3 500 | 2,5 weeks; the only charm that doubles Mythique |

With the 3-per-week cap and these prices, nobody can keep a charm active all the time on mission
earnings alone.

## Visibility

- Opening: before the first tap, a charm badge above the pack shows the charm and the charges left,
  plus the changed odds (struck old value, new value) for the chance charms.
- Cards touched by the charm carry a dot in the charm colour, and the summary says how many cards it
  touched ("dont grâce à la Boussole : 2").
  - Trèfle / Trèfle d'or: Légendaire or Mythique in the last slot.
  - Boussole / Aimant: redirected cards.
  - Éclat: foils.
  - Tamis: duplicates that paid dust.
- League feed: a booster opened with a charm shows the charm icon.

## Shop

- The « Sons & partage » family is removed. « Bonus » takes its place in the SegmentedControl
  (Cartes / Profil / Bonus). Old `?family=sons` links fall back to Cartes.
- Bonus pane: the slot card (ring of charges, name, effect, "N boosters restants") and the list of the
  6 charms with price and Prendre / Remplacer / Actif.
- Replacing asks for confirmation in a bottom sheet that says the remaining charges are lost.
- The weekly count is shown ("2 / 3 cette semaine").
- Mon style keeps only Cartes and Profil.

## Data

Additive migration `0024_wave9b_bonus.sql`:
- `member_wallets.charm text` (nullable) and `member_wallets.charm_charges integer not null default 0`
  with a non-negative check.
- `booster_openings.charm text` (nullable): the charm used by that opening.
- `booster_pulls.is_charm_boosted boolean not null default false`.
- `charm_purchases` (id, league_id, user_id, charm, price, purchased_at) with the member foreign key and an
  index on (league_id, user_id, purchased_at desc). Every purchase also writes `charm.purchased` to
  `audit_log`.

## API

- `GET /api/leagues/:leagueId/charms`: active charm and charges, purchases in the last 7 days, the
  weekly limit, whether the league already has a Mythic.
- `POST /api/leagues/:leagueId/charms/purchases` `{ charmId, replace }`: paid from the league wallet
  under the wallet lock, in one transaction.
- `WalletState.charm` exposes `{ id, charges } | null` everywhere the wallet is returned.
- `BoosterOpening.charm` is the charm used by this opening with the charges left after it, and
  `BoosterPull.isCharmBoosted` flags the touched cards.
- The charge is spent in the same transaction as the opening.
