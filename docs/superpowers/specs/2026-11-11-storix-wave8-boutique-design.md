# Wave 8 — Boutique (I-23) and optional Moment title

Design artifact: https://claude.ai/artifact/EjRKD6B7PnbLizhLzj8WiU. Source:
`scratchpad/wave8/boutique.html` in the planning session. User picks (2026-11-11):

- Moment title: proposal **A** ("Sous la carte"), with all recommended rules.
- Boutique: proposal **B** ("Le catalogue et la cabine d'essayage"), plus C's idea of coherent
  themes across item types. No "Compléter" bundle discount.
- v1 cosmetics: booster bundle, card back, rarity frame set, avatar frame and reveal aura.
- Rules: all recommendations.

Implementations must be pixel-faithful to the artifact at app scale. The mocks are drawn in a 390 px
phone at 0.72; the app uses DS 14 px text, so a uniform ~1.2× is expected. Layout, proportions,
colours, radii, copy and data shown must match.

## 1. Optional Moment title

- On `moment-preview`, under the Moment card mock, add a field:
  - label "Titre · facultatif" (DS `label` style);
  - placeholder = the auto title ("Moment du 11 novembre");
  - right-aligned counter `N/40` in tabular figures;
  - hint "Laisse vide pour garder ce titre." under the field.
- The card band shows the typed title live. When empty, it shows the auto title in `color-muted`
  (`.band b.auto`).
- When the field is focused (keyboard open), the card mock shrinks from 250 to 188 artifact px, so
  the field stays visible above the keyboard.
- "Publier" works with an empty field.
- Rules are the same as for card titles: `cardTitleSchema` (trimmed, 1-40). A string that is empty
  after trimming is sent as absent.
- API: `postMomentBodySchema` gains `title: cardTitleSchema.optional()`. The service uses
  `input.title ?? momentCardTitle(slot)`. Nothing else changes: the title flows through
  `completeMomentUploads` and is copied to the card by the worker.

## 2. Boutique

Cosmetics only. Cards are never sold. Prices are in paillettes.

### Navigation

- The bottom nav slot right of `+`, today a disabled "Échanges · bientôt", becomes the
  **Boutique** link: `/l/$leagueId/shop`. Order: Accueil, Collection, +, Boutique, Profil.
- Add a `shop` glyph to the in-house `Icon` set: a 24 viewBox bag, stroke 1.8, round caps.
- Profil gets a "Mon style" row that opens `/l/$leagueId/profile/style`.

### Catalogue (`/l/$leagueId/shop`)

- Title "Boutique" with the dust pill: the balance of the **current league**.
- One row of category chips: Boosters · Dos · Raretés · Profil · Ouverture. "Profil" holds the avatar
  frames, "Ouverture" the reveal auras.
- One row per theme (`.lrow`): a preview (pack pair, card back, 2-3 mini framed cards, avatar ring
  or aura), the name, a sub-line ("Standard + premium", "6 raretés", "Vu par la ligue"…), and a
  state on the right:
  - "Porté" (`.eq`, accent): the item is equipped;
  - "Acquis" (green): the item is owned but not equipped;
  - otherwise the price `1 500 ✦`.
- The first row of each category is the default ("Nuit holo" / "D'origine"). It is always owned and
  free.
- Tapping a row opens the cabin on that theme.

### Cabin (`/l/$leagueId/shop/try/$category`, `?item=`)

- Full screen on `.tryon`: a back link "Boutique", and the pill "Essai · rien n'est dépensé" (`.tag.new`).
- Eyebrow = category name, title = theme name, sub-line "Sur 6 cartes de ta collection".
- The preview depends on the category:
  - **Raretés:** a 3×2 grid of the viewer's **real owned cards**, one per tier when possible
    (Commune → Mythique), rendered with the theme's frame set.
  - **Boosters:** the real standard and premium packs in the theme. Tapping plays the existing tear
    animation once.
  - **Dos:** a real card flip, back first, then the face of one of their cards.
  - **Profil:** their avatar (xl) in the frame, then a feed-row sample.
  - **Ouverture:** the aura around one of their cards, in that card's tier colour.
- Horizontal swipe (or the dots) moves to the previous or next theme of the category. The dots
  show the position.
- Bottom CTA:
  - not owned: "Acheter · 2 500 ✦";
  - owned but not equipped: "Porter";
  - equipped: "Porté", disabled.
- **Card fallback:** with fewer than 6 owned cards, fill the remaining slots by tier with the
  viewer's other cards. With zero cards, use the static sample faces (photo gradients from the
  artifact) and change the sub-line to "Sur des cartes d'exemple".

### Purchase confirmation (bottom sheet, existing `BottomSheet` primitive)

- Title: "Acheter les raretés Néon ?" or "Acheter le lot de boosters Néon ?", and so on.
- A recap preview of the item.
- A switch row "Porter tout de suite", sub-line "Tu peux changer dans Profil › Mon style", on by
  default.
- Primary button "Acheter · 2 500 ✦", and under it "Il te restera 840 ✦ dans <league name>".
- If the balance is too low, the button is disabled and the line reads
  "Il te manque N ✦ dans <league name>.".
- On success: toast "Acheté", the dust pill animates, and the cabin CTA turns to "Porté" (or
  "Porter").

### Profil › Mon style (`/l/$leagueId/profile/style`)

- One slot per type (`.slot`): Boosters, Dos de carte, Cadres de rareté, Cadre d'avatar,
  Aura de révélation.
- Each slot shows the equipped item (or "<name> · d'origine") and a "Changer" link. The avatar
  frame sub-line adds "vu par la ligue" in cyan.
- "Changer" opens a bottom sheet listing the default plus the owned items of that slot. Selecting
  one equips it immediately.

### v1 catalogue (static, `packages/shared/src/cosmetics/catalog.ts`)

| Slot | Items (id → name) | Price |
| --- | --- | --- |
| `booster` (standard + premium together) | `booster-neon` Néon · `booster-or-noir` Or noir · `booster-aquarelle` Aquarelle | 1 500 |
| `cardBack` | `back-neon` Néon · `back-or-noir` Or noir · `back-aquarelle` Aquarelle | 600 |
| `raritySet` | `rarity-neon` Néon · `rarity-gemmes` Gemmes · `rarity-filet` Filet | 2 500 |
| `avatarFrame` | `frame-couronne` Couronne d'or (`.avring`) · `frame-arc-en-ciel` Arc-en-ciel (`.av2`) · `frame-neon` Néon (cyan/magenta double glow) | 500 |
| `revealAura` | `aura-petales` Pétales · `aura-etoiles` Étoiles · `aura-flocons` Flocons | 800 |

Visual references, copied from the artifact CSS:

- Packs: `.pk.th-neon|th-or|th-aqua`, with the gold premium halo `.pk.prem` kept for every theme.
- Card backs: `.bk.th-*`.
- Rarity sets: `.s-neon|.s-gem|.s-filet`.
  - **Every tier keeps its hue.** The holo overlay of Épique, Légendaire and Mythique stays on top.
  - Mythique keeps its rainbow, adapted per set (as in the artifact).
- Auras: the particle shape changes (petal ellipses, 4-point stars, 6-arm flakes). The colour stays
  the tier colour.
- Default theme: Nuit holo / D'origine, which is today's look.

## 3. Rules

- **Payment:** from the wallet of the league the user is in (`member_wallets.dust`). It is atomic:
  inside a transaction, take the shared league economy lock and lock the wallet row `FOR UPDATE`,
  then check the balance, decrement it and insert the purchase. Errors:
  - `INSUFFICIENT_DUST` 409 when the balance is too low;
  - `ALREADY_OWNED` 409 when the item is already owned;
  - 400 for an unknown item.
  
  The price always comes from the shared catalogue, never from the client.
- **Ownership** is account-wide: an item bought in one league applies in every league.
- **Equipped** is per user, account-wide, one item per slot, `null` = default.
- **Viewer-side** skins (booster, card back, rarity set, aura) change only the owner's screens.
  Other members always see their own style.
- **Avatar frame** is the one item **seen by the league**. The API returns `avatarFrame` with every
  member payload that carries an avatar:
  - member summary;
  - member profile;
  - me;
  - league goal helpers.

  The web renders it everywhere `Avatar` is used for a member (feed, members, card detail, reactions,
  goal, member header).
- **Share images** follow the viewer's rarity set. First, every hard-coded tier colour moves into
  one web map (`features/cosmetics/rarity-palettes.ts`). Today's copies are in:
  - `boosters/arcade/tiers.ts`;
  - `share/canvas/primitives.ts` and `share-layouts.ts`;
  - `card-vitrine.css`, `booster-stage.css`, `league-goal.css`, `moderation.css`.

  CSS keeps reading `--color-tier-*`, and the TS consumers read the map. For the default set this
  step changes nothing visible.
- **Card back** is used only in the booster opening. Locked "à découvrir" cards keep their blur.
- **Catalogue:** permanent, static, versioned in the repo. No rotation; limited items come with
  wave 9.
- **No refunds.**
- **History:** a `cosmetic_purchases` table, plus an audit entry `cosmetic.purchased` (category
  `economy`) shown in the admin Journal: "Léa a acheté Raretés Néon · 2 500 ✦".
- **Gifting:** later, not in this wave.

## 4. Data (migration 0021)

- `cosmetic_purchases`:
  - columns: `id uuid pk`, `user_id text not null` (fk user, cascade), `item_id text not null`,
    `league_id uuid null` (fk leagues, **set null**, so ownership survives a deleted league),
    `price int not null check >= 0`, `purchased_at timestamptz default now()`;
  - `unique (user_id, item_id)`.
- `user_cosmetics`:
  - columns: `user_id text pk` (fk user, cascade), then `booster`, `card_back`, `rarity_set`,
    `avatar_frame`, `reveal_aura`, all `text null`, and `updated_at`;
  - the row is created lazily on first equip.
- Item ids are validated in the app against the shared catalogue. The DB has no enum, so adding a
  theme needs no migration.

## 5. API

- `GET /api/me/cosmetics` → `{ owned: CosmeticItemId[], equipped: EquippedCosmetics }`.
- `PUT /api/me/cosmetics/equipped` `{ slot, itemId | null }` → `EquippedCosmetics`. Rejects an item
  that is not owned (403 `NOT_OWNED`) or that belongs to another slot (400).
- `POST /api/leagues/:leagueId/cosmetics/purchases` `{ itemId, equip }` →
  `{ dust, owned, equipped }`. The caller must be a member. Writes the audit entry.
- `GET /api/leagues/:leagueId/cosmetics/try-on-cards` → up to 6 of the viewer's owned cards, chosen
  by the pure `pickTryOnCards` (one per tier from Commune up, then fill), in the collection card
  payload shape.
- Member payloads gain `avatarFrame: CosmeticItemId | null`, joined from `user_cosmetics`.

## 6. Web

- `features/cosmetics/`:
  - `cosmetics.api.ts`, `cosmetics.queries.ts`;
  - `StyleProvider` / `useEquippedStyle()`: a context fed by `GET /me/cosmetics`; the cabin nests
    an overriding provider for its preview;
  - `rarity-palettes.ts`;
  - presentational previews: pack pair, back, mini-card row, avatar ring, aura;
  - shop screens and the Mon style screen.
- Components consuming the style set a class from the context, never from a global data
  attribute, so the cabin preview can override it locally:
  - `CardFace` and the locked/hidden faces → `rs-neon|rs-gemmes|rs-filet`;
  - `BoosterPack`, `ArcadePack` and the booster-history minis → `skin-*`;
  - `CardBackArt` → `back-*`;
  - the arcade aura/particles → shape;
  - `Avatar` gets a `frame` prop.
- Styles: `styles/cosmetics-packs.css`, `cosmetics-backs.css`, `cosmetics-rarity.css`,
  `cosmetics-avatar.css`, `cosmetics-aura.css` and `shop.css`, all ported from the artifact.
- Admin Journal: an audit sentence for `cosmetic.purchased`.
- Release note `2026-11-11-c` (features only): Boutique, Mon style, title on Moments.
