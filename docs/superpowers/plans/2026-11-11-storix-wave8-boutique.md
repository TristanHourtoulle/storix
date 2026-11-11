# Wave 8 — Boutique + optional Moment title: implementation plan

The spec is `docs/superpowers/specs/2026-11-11-storix-wave8-boutique-design.md`. Design artifact:
https://claude.ai/artifact/EjRKD6B7PnbLizhLzj8WiU. The HTML source is at
`/private/tmp/claude-501/-Users-tristanhourtoulle--paradev-sessions-victorious-hamster-f823c5be/6fed4cb0-f662-4084-a273-8ad07532b676/scratchpad/wave8/boutique.html`.
Diff every UI task against it.

Branch `feat/wave8-boutique`, worktree `../storix-wave8`. One commit per task, Conventional Commits.

Layering:
- routes = HTTP only;
- services = use cases;
- repositories = DB only;
- pure rules in `packages/shared`;
- React: presentational components plus data hooks.

Code rules: English, JSDoc only on public functions, no inline comments, no `any`, immutable. Tests
cover only the pure domain (a handful of cases per file). No CI.

Gate for every task: `pnpm -r typecheck`, `pnpm lint`, and `pnpm --filter @storix/shared test` when
shared changes.

## Dependency graph

```
T1 shared ──┬── T2 db ── T3 api ─────────────┐
            │                                 ├── T8 release note + E2E
            ├── T4 web palette refactor ── T5 web skins ── T6 web shop
            └── T7 web moment title (only needs T1)
```

Parallel-safe groups (no shared files):
- T2 can run with T4 and T7.
- T3 can run with T4/T5 and T7.

T5 and T6 are sequential: T6 uses T5's preview components.

## T1 — shared: cosmetics catalogue, domain, schemas, Moment title (`feat(shared)`)

Files:
- `packages/shared/src/cosmetics/catalog.ts`: `COSMETIC_SLOTS = ['booster','cardBack','raritySet','avatarFrame','revealAura']`
  and `COSMETIC_ITEMS`, readonly, each `{ id, slot, name, price, visibility: 'self' | 'league', sortOrder }`,
  with the ids and prices from spec §2. Also `DEFAULT_THEME_NAME` per slot ("Nuit holo" for
  booster/cardBack, "D'origine" for the others).
- `packages/shared/src/domain/cosmetics.ts` (+ `cosmetics.test.ts`, about 6 cases):
  - `findCosmetic(id)`;
  - `cosmeticsOfSlot(slot)`;
  - `purchaseDecision({ item, owned, dust })` → `'ok' | 'already_owned' | 'insufficient_dust'`;
  - `canEquip({ slot, itemId, owned })`;
  - `pickTryOnCards(cards: {id, tier}[], max = 6)`: one per tier, Commune → Mythique, then fill by
    tier order; stable; never duplicates.
- `packages/shared/src/schemas/cosmetics.ts`:
  - `cosmeticItemIdSchema` (enum from the catalogue);
  - `cosmeticSlotSchema`;
  - `equippedCosmeticsSchema` (one nullable item id per slot);
  - `myCosmeticsResponseSchema`;
  - `equipCosmeticBodySchema` (`{ slot, itemId: nullable }`, refined so the item belongs to the slot);
  - `purchaseCosmeticBodySchema` (`{ itemId, equip: boolean }`);
  - `purchaseCosmeticResponseSchema` (`{ dust, owned, equipped }`);
  - `tryOnCardsResponseSchema` (reuse the collection card schema).
- `packages/shared/src/schemas/errors.ts`: add `ALREADY_OWNED`, `NOT_OWNED`.
- `packages/shared/src/domain/audit.ts`: add `'cosmetic.purchased'` → `economy`, plus the metadata
  shape `{ itemId, price }` wherever audit metadata is typed.
- `packages/shared/src/schemas/{members,member-profile,auth,league-goal}.ts`: add
  `avatarFrame: cosmeticItemIdSchema.nullable()` next to every `avatar`. Update `portraits.test.ts`
  fixtures.
- `packages/shared/src/schemas/moments.ts`: `postMomentBodySchema` gains
  `title: cardTitleSchema.optional()`.
- Export everything from `src/index.ts` and `domain/index.ts`.

Acceptance: shared tests are green, and `pnpm -r typecheck` fails only where the new `avatarFrame`
must be supplied (API/web). Those failures are fixed in T3 and T5.

## T2 — db: migration 0021 (`feat(db)`)

Files:
- `packages/db/src/schema/cosmetics.ts`: `cosmeticPurchases` and `userCosmetics` as spec §4, with
  FKs to the auth `user` table (cascade) and `leagues` (set null).
- Export it from `schema/index.ts`.
- Generate `packages/db/drizzle/0021_wave8_boutique.sql` + snapshot/journal with the repo's drizzle
  generate script. Do not apply it.

Acceptance: the SQL holds 2 tables, unique `(user_id, item_id)`, `price >= 0` check, and nothing else.

## T3 — api: cosmetics feature, member frames, Moment title (`feat(api)`)

Files:
- `apps/api/src/features/cosmetics/`:
  - `cosmetics.repository.ts`: owned ids, equipped row, upsert equipped, insert purchase, frames by
    user ids.
  - `cosmetics.service.ts`:
    - `getMine`;
    - `equip` (uses `canEquip`, `NOT_OWNED` 403);
    - `purchase`: one transaction; `lockLeagueEconomyShared` then `lockWallet` (`FOR UPDATE`), then
      `purchaseDecision` (409s), then `updateWallet` dust−price, insert purchase, optional equip,
      audit `cosmetic.purchased`;
    - `tryOnCards`: owned copies → `pickTryOnCards` → existing collection card mapper.
  - `cosmetics.routes.ts`: the 4 routes of spec §5, Zod-validated, auth-guarded. Membership is
    checked for the league routes.
- Register in `apps/api/src/app.ts` and the services wiring.
- Members:
  - `members.repository.ts`, `member-profile.repository.ts`, `me.service.ts` and the league-goal
    helpers repository: left join `user_cosmetics` and map `avatarFrame`.
  - One query per list, no N+1.
- `apps/api/src/features/moments/moments.service.ts` (+ route body passthrough): use
  `input.title ?? momentCardTitle(slot)`.

Acceptance:
- `pnpm -r typecheck` passes for api.
- The service enforces the price from the catalogue and never from the client.
- Concurrent double purchase → one success and one `ALREADY_OWNED` (unique constraint mapped to 409).

## T4 — web: centralize tier colours (`refactor(web)`, no visual change)

Files:
- New `apps/web/src/features/cosmetics/rarity-palettes.ts`: `RARITY_PALETTES[raritySetId | 'default'][tier]`
  = `{ ring, gem, particles, mythicRainbow, frame: 'ring' | 'neon' | 'gem' | 'filet' }`. The default
  values are copied from today's `arcade/tiers.ts` and `share/canvas/primitives.ts`.
- `boosters/arcade/tiers.ts`: `tierFx(tier, palette)` reads the palette.
- `share/canvas/primitives.ts` and `share-layouts.ts`: take the palette as a parameter.
- CSS files with hex tier copies (`card-vitrine.css`, `booster-stage.css`, `league-goal.css`,
  `moderation.css`): switch them to `var(--color-tier-*)` / existing tokens.

Acceptance: the default rendering is pixel-identical (spot-check the booster opening and the share
image), and `grep` finds no tier hex outside `app.css` tokens and `rarity-palettes.ts`.

## T5 — web: style context and skins (`feat(web)`)

Files:
- `features/cosmetics/`:
  - `cosmetics.api.ts`, `cosmetics.queries.ts` (`myCosmeticsQueryOptions`, staleTime 30 s);
  - `style-context.tsx`: `StyleProvider`, `useEquippedStyle`, and an `override` prop for the cabin;
  - mount the provider in `routes/_authed.tsx`.
- Skins, each a class from the context, with CSS ported verbatim from the artifact and scaled
  1.2×:
  - Packs: `game/components/booster-pack.tsx`, `boosters/components/arcade-pack.tsx`, booster
    history minis → `skin-neon|skin-or-noir|skin-aquarelle`. CSS in `styles/cosmetics-packs.css`,
    from `.pk.th-*` and `.pk.prem`. The premium gold halo is kept.
  - Card back: `boosters/components/arcade-card.tsx` `CardBackArt` → `styles/cosmetics-backs.css`
    (from `.bk.th-*`).
  - Rarity sets:
    - `cards/components/card-face.tsx` (+ locked/hidden faces for the ring only) →
      `styles/cosmetics-rarity.css` (`.s-neon/.s-gem/.s-filet`, holo kept above);
    - share canvas and arcade FX get `RARITY_PALETTES[set]` from the context.
  - Aura: `arcade/particles.ts` shape per aura id; `booster-card.css` keeps the tier colour.
    `styles/cosmetics-aura.css`.
  - Avatar frame:
    - `components/ui/avatar.tsx` gets a `frame?: CosmeticItemId | null` prop →
      `styles/cosmetics-avatar.css` (from `.avring`, `.av2`, and a neon double glow);
    - a `useMemberAvatarFrames(leagueId)` hook next to `use-member-avatars.ts`;
    - pass `frame` at every member `Avatar` call site: feed-row/feed-list, members row/directory/
      header, card-detail, reactions, promoted-holders, reactors-summary, goal card/helpers, member
      chip, profile header.

Acceptance:
- Equipping each item (seeded via the API) changes only the owner's screens.
- Another member sees the owner's avatar frame and nothing else.
- Reduced motion is respected.

## T6 — web: Boutique screens (`feat(web)`)

Files:
- `components/ui/icon.tsx`: add the `shop` glyph.
- `components/ui/bottom-nav.tsx`: the disabled "Échanges" slot becomes the Boutique link with
  `NavSection` `'shop'`.
- Routes:
  - `routes/_authed/l.$leagueId.shop.index.tsx`: catalogue;
  - `l.$leagueId.shop.try.$category.tsx`: cabin, with `item` search param validated by Zod;
  - `l.$leagueId.profile.style.tsx`: Mon style.
- `features/cosmetics/components/`:
  - `shop-catalogue.tsx`, `shop-category-chips.tsx`, `shop-item-row.tsx`;
  - `try-on-cabin.tsx`, with swipe via pointer events like the whats-new booster, and dots;
  - `try-on-preview-*.tsx`, one per slot;
  - `purchase-sheet.tsx`, using `BottomSheet`, the switch, and the remaining/missing dust line;
  - `my-style.tsx`, `style-slot-sheet.tsx`.
- Hooks: `use-try-on-cards.ts`, `use-purchase-cosmetic.ts` (mutation; invalidates the wallet + my
  cosmetics queries; triggers the dust pill fly), `use-equip-cosmetic.ts`.
- `styles/shop.css`: ported from the artifact `.lrow/.eq/.price/.seg/.tryon/.dots/.slot`.
- Profil: add the "Mon style" row in `l.$leagueId.profile.index.tsx`.
- `features/audit/audit-sentence.ts`: the sentence for `cosmetic.purchased`.

Acceptance:
- Every screen matches artifact proposal B (screens 1-4) side by side at 390 px.
- Purchase with low dust → disabled button + "Il te manque…".
- 0 owned cards → sample faces + "Sur des cartes d'exemple".

## T7 — web: Moment title (`feat(web)`, parallel with T4-T6)

Files:
- `features/moments/components/moment-preview.tsx`: the field, counter, hint, live band, and the
  card shrink on focus. Styles in `styles/moments.css`, from artifact `.field/.input/.band b.auto`.
- The moments API client / mutation sends `title` when non-empty after trim.

Acceptance:
- Typing updates the band live, and the card shows the title after the booster pull.
- With an empty field the card is still titled "Moment du …".

## T8 — release note, review, E2E (`feat(shared)` + checks)

- `packages/shared/src/release-notes/catalog.ts`: add entry `2026-11-11-c` with these cards:
  - "La Boutique" (legendary, try target shop);
  - "Mon style" (epic);
  - "Un titre pour tes Moments" (rare).

  If the whats-new schema needs one, add a `shop` try-target and illustration (or reuse `premium`).
- A context-free review of the full diff: layering, scope, and no regression.
- Apply 0021 locally. Chrome E2E at 390 px:
  - purchase OK / insufficient dust / already owned;
  - equip and unequip;
  - cabin swipe;
  - 0-card fallback;
  - avatar frame seen from a second account;
  - share image with a rarity set;
  - Moment with and without a title.

  Pixel comparison against the artifact. Close the tabs.
- Merge to main and deploy to Railway (migration 0021). Check the worker and api health.
