# Storix — Premium booster + computed Mythic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax.
>
> **Commits:** each task ends with a commit step that runs ONLY when the orchestrator says so. Without that go-ahead, stop at the commit step and report.

**Goal:**
- Mythic becomes a computed tier: a rank quota of about the top 1%, from 50 active cards. The admin pin stays.
- Every 20th booster a member opens is premium:
  - slot 5 is Legendary 85 / Mythic 15;
  - slot 4 is Rare 75 / Epic 25.
- Members see:
  - a "Booster premium dans N" gauge;
  - a gold pack with a golden aura;
  - a "Probabilités" sheet.

**Architecture:**
- **Pure domain in `@storix/shared`:**
  - a Mythic quota selection inside the rarity engine;
  - a version-gated premium draw (`DROP_TABLE_VERSION` 4);
  - premium counter helpers;
  - odds helpers.
- **DB:** one wallet counter (`boosters_opened`, backfilled) and one opening flag (`is_premium`).
- **API:** reads and writes the counter inside the existing locked opening transaction.
- **Web:** renders the gauge and the odds sheet from the wallet state and the shared constants, and switches the arcade pack to its premium modifier.

**Spec:** `docs/superpowers/specs/2026-11-10-storix-premium-booster.md`. Read it fully before any task; decision numbers (D1…D18) and sections refer to it.

**Design system:** https://claude.ai/artifact/PnujcYudoKxB6yCvdwWchz (`project/README.md`) covers tokens, rarity colours, French copy rules and reduced motion.

**Branch / worktree:** `feat/premium-booster`, in its own worktree off `origin/main` (fd89466). The orchestrator creates it.

## Global constraints

- **Toolchain:**
  - Node 24 (`source ~/.nvm/nvm.sh && nvm use 24`).
  - No new dependency. Keep every pinned version.
- **Code:**
  - TypeScript strict, `noUncheckedIndexedAccess`, no `any`, immutable data, Zod at every boundary.
  - NO comments in code except basic JSDoc on exported functions.
  - Code, logs and commits in English. UI copy in French: tutoiement, sentence case, no emoji, ✦ is the only glyph.
- **Layering**, exactly as `eslint.config.js`:
  - routes are HTTP only;
  - services are use cases;
  - repositories are Drizzle only;
  - `packages/shared/src/domain` is pure and imports only `./*`;
  - web components are presentational, with data in hooks.
- **Tests:** at most a handful of NEW cases, only in `booster-draw.test.ts`, the new `premium-booster.test.ts`, and `rarity-tiers.test.ts` / `rarity-engine.test.ts`. Do not add matrices. Existing tests must keep passing; update them only where a type or constant changed by design.
- **Off-limits:**
  - Never boot or stop servers outside Portly.
  - Never touch Docker, `.env`, `db:push` or seeds.
  - Migration generation uses a dummy URL: `DATABASE_URL=postgres://x@localhost/x pnpm db:generate`.
- **Standard verify,** from the worktree root, all must pass: `pnpm typecheck && pnpm lint && pnpm test`. Web tasks also run `pnpm --filter @storix/web build`.
- If a real name differs from this plan, keep the behaviour, use the real name, and say so in the report.

## Parallelization map

| Group | Tasks | Parallel? | Shared files (serialize) |
|-------|-------|-----------|--------------------------|
| G1 domain | T1, T2 | **yes, with each other** (disjoint files) | none: `domain/index.ts` uses `export *`. T2 adds one export line; T1 touches none. |
| G2 contracts | T3 | after G1 | `packages/shared/src/schemas/*` |
| G3 server | T4 → T5, and T6 | T4 after T3. T5 after T4. T6 after T3, **in parallel with T4/T5** | T5: `features/boosters/*`, `features/wallets/*`. T6: `features/moderation/*` (api + web) |
| G4 web | T7, T8 | after T3, **in parallel with each other and with G3** | T7: `features/game/*`, `styles/home*.css` (or the widget's real css). T8: `features/boosters/*`, `styles/booster-pack.css`. `BoosterPack` (`features/game/components/booster-pack.tsx`) belongs to T7 only. |
| G5 verify | T9 | last | none |

Write-agents that run in parallel must use separate worktrees or strictly the disjoint files listed above.

---

## Task 1 — Domain: computed Mythic quota (spec §4.1, D1-D6)

**Files**
- Modify `packages/shared/src/domain/cards.ts`, `rarity-tiers.ts`, `rarity-engine.ts`, `moderation.ts`
- Modify tests `packages/shared/src/domain/rarity-tiers.test.ts`, `rarity-engine.test.ts`, only for type fallout plus the new cases

**Steps**
- [ ] `cards.ts`: add `'mythic'` to `COMPUTED_TIERS`. Add `BOUND_TIERS` (common → legendary) and `type BoundTier`. `PROVISIONAL_TIER: ComputedTier = 'common'` stays.
- [ ] `rarity-tiers.ts`:
  - `TierBounds = Readonly<Record<BoundTier, number>>`.
  - `tierForValue`, `tierForBasisPoints`, `applyHysteresis` and `capColdStartTier` work on `BoundTier`.
  - `resolveEffectiveTier({ computed: ComputedTier, pinned, min: BoundTier | null, max: BoundTier | null })`.
- [ ] `rarity-tiers.ts`, new exports:
  - `MYTHIC_MIN_CARDS = 50`, `MYTHIC_CARDS_PER_QUOTA = 100`, `MYTHIC_RETAIN_PERCENTILE = 0.95`.
  - `mythicQuota(activeCardCount)`: `n < 50 ? 0 : Math.max(1, Math.floor(n / 100))`.
  - `selectComputedMythics(candidates, quota): ReadonlySet<string>`, implementing D3 and D4 (spec):
    - candidates are `{ cardId, number, score, percentile, isEligible, wasMythic }`;
    - retained = eligible ∧ wasMythic ∧ percentile ≥ 0.95, best score first, capped at the quota;
    - remaining slots go to eligible non-retained cards by score desc, then `number` asc, then `cardId`.
- [ ] `rarity-engine.ts`:
  - Hysteresis gets `previous = previousComputedTier === 'mythic' ? 'legendary' : previousComputedTier`.
  - After the band tiers are computed, call `selectComputedMythics`, with `isEligible = pinnedTier === null && maxTier === null` and `wasMythic = previousComputedTier === 'mythic'`. The quota is 0 when `n < COLD_START_CARD_COUNT`.
  - Override `computedTier = 'mythic'` for the selected cards, then `resolveEffectiveTier`.
  - `RarityCardInput.minTier` / `maxTier` become `BoundTier | null`.
- [ ] `moderation.ts`: `areTierBoundsValid(min: BoundTier | null, max: BoundTier | null)`.
- [ ] Tests, 3-4 new cases total:
  - `mythicQuota` at 49 → 0, 50 → 1, 199 → 1, 200 → 2;
  - `selectComputedMythics` retains a previous Mythic still ≥ 0.95 over a slightly higher newcomer when quota = 1;
  - an ineligible (pinned) top card is skipped;
  - engine: 60 active cards with distinct scores give exactly one `computedTier === 'mythic'`, the top-scored card; 19 cards give none.

**Acceptance:**
- The domain imports only `./*`.
- Every pre-existing rarity test still passes unchanged in intent.
- Standard verify passes for `@storix/shared`. Typecheck errors in api/worker/web caused by the `BoundTier` split are EXPECTED and are fixed by T3/T6. Report them, do not fix outside `packages/shared/src/domain`.

**Commit:** `feat(shared): compute mythic tier as a top 1% rank quota`

## Task 2 — Domain: premium booster draw + odds (spec §4.2, D8, D11-D14, D16) — parallel with T1

**Files**
- Create `packages/shared/src/domain/premium-booster.ts`, `packages/shared/src/domain/premium-booster.test.ts`
- Modify `packages/shared/src/domain/booster-draw.ts`, `booster-draw.test.ts`, `packages/shared/src/domain/index.ts` (one `export * from './premium-booster'`)

**Steps**
- [ ] `premium-booster.ts`:
  - `PREMIUM_BOOSTER_EVERY = 20`;
  - `isPremiumBooster(boostersOpenedBefore: number): boolean`, which is `(n + 1) % 20 === 0`;
  - `premiumSummary(boostersOpened): { boostersUntil: number; progress: number }`, with `boostersUntil = 20 - (n % 20)` and `progress = (n % 20) / 20`.
- [ ] `booster-draw.ts`:
  - `DROP_TABLE_VERSION = 4` and `PREMIUM_SINCE_VERSION = 4`;
  - `PREMIUM_BOOSTER_SLOTS: readonly TierWeights[] = [CU, CU, CU, { rare: 75, epic: 25 }, { legendary: 85, mythic: 15 }]`;
  - `PREMIUM_SLOT_FLOORS: readonly (CardTier | undefined)[] = [undefined, undefined, undefined, 'rare', 'legendary']`.
- [ ] `drawBooster` input gains `isPremium?: boolean`. Compute `const isPremium = tableVersion >= PREMIUM_SINCE_VERSION && input.isPremium === true`.
  - Premium: weights = `PREMIUM_BOOSTER_SLOTS[slot]`, floor = `PREMIUM_SLOT_FLOORS[slot]`. No pity adjustments.
  - Non-premium: today's code path, untouched.
  - RNG call order per slot is unchanged.
  - Update the JSDoc: version 4 adds the premium table.
- [ ] Export `slotOddsPercent(weights: TierWeights): Partial<Record<CardTier, number>>`, rounded to one decimal, keeping only tiers with weight > 0. Export the existing slot table as `BOOSTER_SLOTS` (already exported).
- [ ] Tests, 3-4 new cases total:
  - `premium-booster.test.ts`: `isPremiumBooster` is true at 19, 39, and false at 0, 18, 20; `premiumSummary(19).boostersUntil === 1`, `premiumSummary(20).boostersUntil === 20`.
  - `booster-draw.test.ts`: the same seed + pool + pity gives identical draws for `tableVersion: 3` with `isPremium: true` and without it (flag ignored before v4).
  - Premium v4 draw over a pool with Legendary and Mythic gives slot 5 ∈ {legendary, mythic} and slot 4 ≥ rare.
  - Premium draw over a pool without a Mythic or Legendary falls back to the best available (Epic).

**Acceptance:**
- v3 replay is unchanged: all existing `booster-draw.test.ts` cases pass untouched.
- The domain is pure.
- Standard verify passes for `@storix/shared`.

**Commit:** `feat(shared): add premium booster every 20th opening`

## Task 3 — Shared contracts (spec §4.4) — after T1 + T2

**Files**
- Modify `packages/shared/src/schemas/admin-cards.ts`, `wallet.ts`, `boosters.ts`

**Steps**
- [ ] `admin-cards.ts`:
  - `computedTierSchema = z.enum(COMPUTED_TIERS)`, which now includes Mythic, stays on the `computedTier` field.
  - Add `boundTierSchema = z.enum(BOUND_TIERS)` and use it for `minTier`/`maxTier` in the admin card view and for `min`/`max` in the bounds body.
- [ ] `wallet.ts`: `premium: z.object({ boostersUntil: z.int().min(1).max(PREMIUM_BOOSTER_EVERY), progress: z.number().min(0).max(1) })`.
- [ ] `boosters.ts`: `isPremium: z.boolean()` on `boosterOpeningSchema`.

**Acceptance:** standard verify for `@storix/shared` passes. Api/web type errors from the new required fields are expected and are fixed by T5/T6/T7/T8.

**Commit:** `feat(shared): expose premium booster and bound tier contracts`

## Task 4 — DB columns + migration (spec §4.3, D8-D10) — after T3

**Files**
- Modify `packages/db/src/schema/wallets.ts`, `packages/db/src/schema/boosters.ts`, `packages/db/src/queries/rarity-inputs.ts`
- Generated: `packages/db/drizzle/0013_premium_booster.sql` + `meta/0013_snapshot.json` + `_journal.json`

**Steps**
- [ ] `member_wallets`: `boostersOpened: integer('boosters_opened').notNull().default(0)`, plus `check('member_wallets_boosters_opened_non_negative', sql\`${t.boostersOpened} >= 0\`)`.
- [ ] `booster_openings`: `isPremium: boolean('is_premium').notNull().default(false)`.
- [ ] `rarity-inputs.ts`: cast `computedTier` as `ComputedTier | null` (now includes Mythic) and `minTier`/`maxTier` as `BoundTier | null`.
- [ ] `cd packages/db && DATABASE_URL=postgres://x@localhost/x pnpm db:generate --name premium_booster`. Read the SQL: it should only contain the two `ADD COLUMN` statements and the check.
- [ ] Append the backfill at the end of the generated SQL, after a `--> statement-breakpoint`:

  ```sql
  UPDATE "member_wallets" w SET "boosters_opened" = c.n
  FROM (SELECT "league_id", "user_id", count(*)::int AS n FROM "booster_openings" GROUP BY "league_id", "user_id") c
  WHERE w."league_id" = c."league_id" AND w."user_id" = c."user_id";
  ```

  Do NOT apply it.

**Acceptance:** the SQL holds exactly those statements. Standard verify passes for `@storix/db`.

**Commit:** `feat(db): track boosters opened and premium openings`

## Task 5 — API: premium opening + wallet state (spec §4.4, D11, D15) — after T4

**Files**
- Modify `apps/api/src/features/boosters/boosters.service.ts`, `boosters.repository.ts`
- Modify `apps/api/src/features/wallets/wallets.repository.ts`, `wallet-state.ts`

**Steps**
- [ ] Repositories (Drizzle only):
  - `WalletRow` selects `boostersOpened`;
  - `updateWallet` accepts it;
  - `insertOpening` accepts and returns `isPremium`;
  - the stored-opening read (used by `presentStored`) selects `isPremium`.
- [ ] `openNewBooster`:
  - `const isPremium = isPremiumBooster(wallet.boostersOpened)`;
  - `drawBooster({ pool, pity: pityBefore, random, isPremium })`;
  - `insertOpening({ …, isPremium })`;
  - the patch adds `boostersOpened: wallet.boostersOpened + 1`.
  - All of it stays in the same locked transaction (wallet row lock already taken in `withContext`).
- [ ] `present`: return `isPremium` from the opening record. The idempotent replay returns the stored flag.
- [ ] `wallet-state.ts`: `premium: premiumSummary(row.boostersOpened)`. Every other `toWalletState` caller compiles unchanged once `WalletRow` has the field.

**Acceptance:**
- `pnpm --filter @storix/api typecheck && pnpm lint` passes.
- No business rule in repositories or routes: the premium rule is only `isPremiumBooster`.

**Commit:** `feat(api): open a premium booster every 20th opening`

## Task 6 — Moderation: bound tiers + Mythic filter (spec §4.4, §4.5 admin, D5-D7) — after T3, parallel with T4/T5/T7/T8

**Files**
- Modify `apps/api/src/features/moderation/admin-card-view.ts`, `moderation.service.ts`, `moderation.repository.ts`
- Modify `apps/web/src/features/moderation/moderation.api.ts`, `use-card-moderation.ts`, `components/tier-bounds-picker.tsx`
- Modify `apps/worker/src/features/rarity/rarity.repository.ts` (type fallout only)

**Steps**
- [ ] `admin-card-view.ts`:
  - `asComputedTier` keeps its body (`COMPUTED_TIERS` now includes Mythic). Update its JSDoc.
  - Add `asBoundTier(tier)` using `BOUND_TIERS`, used for `minTier`/`maxTier`.
- [ ] `moderation.service.ts`: the bounds types become `BoundTier`. `MYTHIC_CAP` / `countMythicPins` stay unchanged (pins only, D5).
- [ ] `moderation.repository.ts`: `filterCondition('mythic')` becomes `eq(cards.tier, 'mythic')`. Update the doc of the filter if there is one.
- [ ] Web:
  - the bounds types become `BoundTier`;
  - `tier-bounds-picker.tsx` iterates `BOUND_TIERS`;
  - the pin badge in `admin-card-list.tsx` is unchanged.
- [ ] Worker `rarity.repository.ts`: `computedTier: ComputedTier` compiles as is. Fix only real type errors.

**Acceptance:**
- `pnpm typecheck && pnpm lint` passes repo-wide once T5 is also in. Report if run before T5.
- No Mythic option in the min/max picker.

**Commit:** `feat(moderation): bound tiers exclude mythic and list computed mythics`

## Task 7 — Web home: premium gauge + odds sheet + premium widget pack (spec §4.5, D16, D18) — after T3

**Files**
- Modify `apps/web/src/features/game/components/booster-widget.tsx`, `booster-pack.tsx`
- Create `apps/web/src/features/game/components/premium-gauge.tsx`, `booster-odds-sheet.tsx`
- Modify the widget stylesheet (find the one that styles `.hero-pity`; extend it, do not create a parallel file)

**Steps**
- [ ] `PremiumGauge({ premium })`:
  - a gold dot, then "Booster **premium** dans {N} boosters", or "au prochain booster" when N = 1;
  - a slim progress bar with `role="progressbar"` and an `aria-valuenow` from 0 to 20;
  - DS tokens only, using the Legendary gold token.
- [ ] `BoosterOddsSheet({ isOpen, onClose })`:
  - uses `components/ui/bottom-sheet.tsx`, the same slide-up primitive as the collection filters;
  - two sections from `BOOSTER_SLOTS` / `PREMIUM_BOOSTER_SLOTS` via `slotOddsPercent`;
  - tier pills with `TIER_LABELS` and rarity colours;
  - the four footnotes, in the exact French copy from spec §4.5.
- [ ] Widget:
  - render `PremiumGauge` under `EpicGuarantee`;
  - add a "Probabilités" text button (small ghost button or link-style per DS) that opens the sheet, with sheet state in the widget via `useState`;
  - `<BoosterPack size="lg" isPremium={wallet.premium.boostersUntil === 1} />`.
- [ ] `BoosterPack`:
  - an optional `isPremium = false` prop that adds an `is-premium` class;
  - gold foil and halo from DS tokens;
  - static under `prefers-reduced-motion`.

**Acceptance:**
- Standard verify + `pnpm --filter @storix/web build` pass.
- Components are presentational (no `*.api`).
- The sheet is a bottom sheet, not a centred dialog (memory: match artifact patterns).

**Commit:** `feat(web): show premium booster gauge and odds sheet`

## Task 8 — Web opening: premium pack + golden aura (spec §4.5 opening) — after T3, parallel with T7

**Files**
- Modify `apps/web/src/features/boosters/components/arcade-pack.tsx`, `booster-stage.tsx`, `arcade-hud.tsx` (only if the hint lives there), `apps/web/src/styles/booster-pack.css`

**Steps**
- [ ] `ArcadePack` gets an `isPremium = false` prop:
  - it adds `is-premium` on `.ar-pack-wrap`, `.ar-pack-halo` and `.ar-pack-art`;
  - the default subtitle becomes "Premium · {count} cartes".
- [ ] CSS `is-premium`:
  - a gold foil gradient on `.ar-pa-foil`;
  - a gold halo;
  - gold crack glow, using Legendary aura tokens;
  - shimmer only without `prefers-reduced-motion`;
  - no new colour literals outside the DS tokens, beyond the existing `#FBBF24` mark already in the file.
- [ ] `BoosterStage`:
  - pass `opening.isPremium`;
  - before the tear, show the hint "Booster premium : Légendaire garantie" where the existing pre-tear hint renders;
  - reuse the existing component, no new layer.
- [ ] No sound changes (D17).

**Acceptance:**
- Standard verify + web build pass.
- A non-premium opening is pixel-identical to before: the class is absent and the subtitle is unchanged.

**Commit:** `feat(web): premium pack wrapper and golden aura at opening`

## Task 9 — Verification (orchestrator + check agents)

- [ ] Apply migration 0013 locally through the normal flow (`pnpm db:migrate` with the real local env, done by the orchestrator only). Check that `boosters_opened` equals the per-member count of `booster_openings`. Restart `storix/api`, `storix/worker` and `storix/web` via Portly.
- [ ] Trigger a rarity recompute for a local league with 50+ active cards: exactly `mythicQuota(n)` computed Mythics, none on pinned or max-bounded cards. A league under 50 cards has none.
- [ ] API smoke:
  - set a test wallet to `boosters_opened = 19` (local DB only) with stock;
  - open a booster: `isPremium: true`, slot 5 is Legendary or Mythic, slot 4 is Rare or better, `wallet.premium.boostersUntil === 20`;
  - the next opening has `isPremium: false`;
  - replaying the same `requestId` returns the stored flag.
- [ ] Chrome E2E (375 px and desktop, full and reduced motion):
  - home gauge copy for N = 1 / N > 1;
  - the premium widget pack when N = 1;
  - the "Probabilités" bottom sheet: values match the constants; close by swipe, backdrop and Escape;
  - premium opening shows the gold pack, the hint and the gold halo; then the reveal and recap;
  - a classic opening is unchanged;
  - admin: the bounds picker has no Mythic; the "Mythiques" filter lists computed and pinned Mythics; the cap is still 3 pins.
- [ ] Context-free check agent on the full diff: scope adherence, layering, no inline comments, English code, French copy, v3 draw untouched.
