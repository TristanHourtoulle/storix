# Storix wave 8c: cosmetics v2-b (opening tears and themes)

Date: 2026-11-14. Source designs: cosmetics v2 artifact (sections 2 and 8). Scope frozen by the user:
"Go pour v2-b avec déchirure et thème, mais pas les sons".

## Scope

1. New slot `openingTear` (Déchirure d'ouverture), personal (`self` visibility), 1 200 ✦ each:
   - `tear-braises` (Braises): a fire line runs along the top band on each tap, sparks fly up, then the
     blackened top edge falls and embers rise.
   - `tear-verre` (Éclats de verre): the pack cracks like glass under the finger, then the top bursts into
     glass shards tinted with the colour of the best rarity in the booster.
   - `tear-ruban` (Ruban): the pack is wrapped like a gift (gold ribbon cross + bow). Each tap loosens the
     knot, the ribbon unwinds and falls, then the paper top opens.
   - Nothing equipped keeps the current crack + shard burst exactly as it is.
   - Reduced motion: the existing fade-out path is kept for every tear.
2. Themes, prices of v1 slots (lot 1 500, dos 600, raretés 2 500):
   - `booster-cosmos`, `booster-vitrail` (standard + premium bundle, like the v1 boosters).
   - `back-cosmos`, `back-vitrail`.
   - `rarity-vitrail`: black lead border, tier-tinted glass sheen; the 6 tier hues stay readable.
3. No sound packs. The « Sons & partage » family keeps its « Bientôt » state.
4. Release note card for the whats-new slider.

## Shop placement

- Cartes family gets a « Déchirure » chip (after Raretés, before Aura), eyebrow « Déchirure d'ouverture ».
- Mon style lists the slot in Cartes.

## Data

- Additive migration `0023`: `user_cosmetics.opening_tear text` (nullable).
- `equippedCosmeticsSchema.openingTear` uses the tolerant stored-id schema (no transform).
- Not league-visible: no propagation to members, feed or cards.

## Web

- `tearKind(id)` maps item ids to `braises | verre | ruban`.
- Arcade opening: `ArcadePack` renders a tear overlay and, for Braises and Ruban, a separate top piece.
  `hitPack` / `burstPack` take the tear kind; per-tear choreography lives in `arcade/tear-choreography.ts`.
- Try-on cabin: `TearDemo`, an interactive pack you tap three times to play the tear, with a replay
  button; static tear marks on catalogue thumbnails.
- Theme skins: `.pack` (shop / home pack), `.ar-pack-art` (opening), `.ar-back` (backs), rarity frames
  on `.card`, `.hmc`, arcade fronts and the share canvas (`frame: 'vitrail'`).
