# Storix — Premium booster and computed Mythic — Design

Date: 2026-11-10 · Status: scope frozen by the user, ordinary calls made by the planner (§3) · Plan: `docs/superpowers/plans/2026-11-10-storix-premium-booster.md`

## 1. Goal

No member has ever pulled a Mythic. The cause is not bad luck: Mythic is never computed (`COMPUTED_TIERS` stops at Legendary in `packages/shared/src/domain/cards.ts:7`). It only exists when an admin pins a card (cap 3). Without a Mythic in the pool, the 1% Mythic roll of slot 5 silently falls back to a Legendary (`booster-draw.ts`, `resolveTierWithFallback`).

This change does two things:

1. **Mythic becomes a computed tier**: about the top 1% of a league's cards, only once the league has enough cards. The admin Mythic pin stays.
2. **Premium booster**: every 20th booster a member opens in a league (20, 40, 60…) is premium. Slot 5 guarantees Legendary or better with a 15% Mythic chance, and slot 4 guarantees Rare or better. Members see a gauge "Booster premium dans N", a distinct gold pack with a golden aura at opening, and a "Probabilités" sheet.

## 2. Frozen user decisions (2026-11-10)

1. Mythic source: computed top ~1% **plus** the admin pin.
2. Trigger: fixed every 20th booster opened. It is never reset early (a Legendary pulled at booster 5 does not move it).
3. Content: slot 5 Legendary 85 / Mythic 15. Slot 4 Rare or better. Slots 1-3 unchanged.
4. UI: gauge + premium pack visual + odds sheet.
5. Few unit tests (pure domain only), no CI.

## 3. Decisions made by the planner

| # | Decision | Why |
|---|----------|-----|
| D1 | Computed Mythic is a **rank quota**, not a percentile bound. `mythicQuota(n) = n < 50 ? 0 : max(1, floor(n / 100))` over active cards. | With `positionPercentiles`, the best card's percentile is `1 - 0.5/n`. A 0.99 bound plus the 0.02 hysteresis margin could never be crossed by a card that was already Legendary, so a bound-based Mythic would only appear on first computation. A quota is exact, predictable and testable. 50-199 cards → 1 Mythic, 200-299 → 2, etc. |
| D2 | Minimum pool for a computed Mythic: **50 active cards**. Under 20 cards (cold start) there is never a computed Mythic. | Leagues have 5-30 members. A Mythic out of 10 photos would mean nothing. 50 cards matches "1 in 50 is exceptional". |
| D3 | Mythic stability: a card whose **previous** computed tier was Mythic keeps it while it is still eligible and its percentile is ≥ 0.95 (still in the Legendary band). Remaining quota slots go to the best-ranked eligible cards by score (ties: lowest `number`, then `cardId`). Total computed Mythics never exceed the quota. | Same spirit as `HYSTERESIS_MARGIN`: a Mythic does not flicker on every recompute because of one reaction. |
| D4 | Eligible for the computed quota: active cards with **no pin and no max bound**. | A pinned card, or one capped by `maxTier`, can never become Mythic effectively. Giving it a slot would waste the quota. |
| D5 | `MYTHIC_CAP = 3` keeps counting **pins only**. | The computed quota is already bounded by the pool size. The pin is the admin's manual lever. |
| D6 | `COMPUTED_TIERS` gains `'mythic'`. A new `BOUND_TIERS` (common → legendary) is used for admin min/max bounds. A max bound of Legendary blocks a computed Mythic. A min bound can never be Mythic (that would bypass the cap; use the pin). | The rarity engine and `cards.computed_tier` (enum `card_tier`, which already includes `mythic`) need Mythic. The bounds API and picker must not offer it. |
| D7 | The admin "Mythiques" filter lists cards whose **effective** tier is Mythic (`cards.tier = 'mythic'`), pinned or computed. The pin badge in the list stays pin-only. | Admins need to see every Mythic in the league. |
| D8 | New wallet column `boosters_opened integer not null default 0`, with check ≥ 0. A booster is premium when `(boostersOpened + 1) % 20 === 0`. The constant is `PREMIUM_BOOSTER_EVERY = 20` in the domain. It is **not** a league setting. | One monotonic counter answers both "is this one premium?" and "how many left?". YAGNI on per-league config. |
| D9 | **Backfill** `boosters_opened` in the same migration from `count(*)` of `booster_openings` per `(league_id, user_id)`. | It is one `UPDATE … FROM (SELECT … GROUP BY)`, trivial and exact. Active members keep their real progress. If a member is at 19 mod 20, their next booster is premium, which is a welcome surprise. |
| D10 | New column `booster_openings.is_premium boolean not null default false`. `pity_before` jsonb and `PityState` stay unchanged. | The flag is explicit for history, audit and the reveal screen. Old rows are false by default, which is correct. |
| D11 | `DROP_TABLE_VERSION = 4`, with `PREMIUM_SINCE_VERSION = 4`. `drawBooster` takes `isPremium?: boolean` and only honours it when `tableVersion >= 4`. Version ≤ 3 draws are byte-identical for the same seed, pity and pool. RNG order per slot is unchanged (tier, author, card, foil), so a non-premium v4 draw equals a v3 draw. | Old openings replay identically, same pattern as `EPIC_FLOOR_SINCE_VERSION`. |
| D12 | Premium weights: slot 4 `{ rare: 75, epic: 25 }` with fallback floor `rare`. Slot 5 `{ legendary: 85, mythic: 15 }` with fallback floor `legendary`. Slots 1-3 keep `CU`. On a premium booster, the Legendary soft-pity bonus and the Epic floor are ignored for slot 5: it is already Legendary or better. | Slot 4 at 25% Epic makes premium feel richer without stealing the slot-5 moment. The fallback floor keeps "the best available" when the pool lacks a tier. |
| D13 | Pool without a Mythic: the Mythic roll falls back to Legendary. Without a Legendary, `resolveTierWithFallback` with floor `legendary` goes up first (Mythic), then down (Epic…). The odds sheet says so in plain French. | It never blocks an opening. It is honest about small leagues. |
| D14 | Pity after a premium booster: `nextPityState` is unchanged. A Legendary or Mythic pull resets both `sinceEpic` and `sinceLegendary` naturally. | No special case. |
| D15 | Wallet API: `premium: { boostersUntil: int 1..20, progress: number 0..1 }`, where `boostersUntil = 20 - (boostersOpened % 20)`. The opening API adds `isPremium: boolean`. | The home gauge and the stage read state, not rules. |
| D16 | Odds come from shared domain constants (`BOOSTER_SLOTS`, `PREMIUM_BOOSTER_SLOTS`) through a pure `slotOddsPercent(weights)`. The web sheet renders them. There is no API endpoint. | One source of truth: the sheet can never drift from the draw. |
| D17 | No new sound. The premium tear reuses the existing pack sounds. The Legendary/Mythic card auras already play their tier sounds. | Sound design is frozen (Arcade set). |
| D18 | The gauge copy shows on the home widget under "Épique garantie…": "Booster **premium** dans N boosters", or "au prochain booster" when N = 1. When the next booster is premium, the widget pack uses the premium wrapper. | It is a real guarantee, unlike the Legendary soft pity (which stays hidden, per the 2026-11-08 decision). |

## 4. Design

### 4.1 Domain — computed Mythic (`packages/shared/src/domain`)

- `cards.ts`:
  - `COMPUTED_TIERS = ['common','uncommon','rare','epic','legendary','mythic']`.
  - `BOUND_TIERS = ['common','uncommon','rare','epic','legendary']`, with `type BoundTier`.
  - `PROVISIONAL_TIER` stays `'common'`.
- `rarity-tiers.ts`:
  - `TierBounds` becomes `Record<BoundTier, number>`. The bounds tables stay unchanged, without a Mythic entry.
  - `tierForValue`, `applyHysteresis` and `capColdStartTier` operate on `BoundTier`.
  - New constants: `MYTHIC_MIN_CARDS = 50`, `MYTHIC_CARDS_PER_QUOTA = 100`, `MYTHIC_RETAIN_PERCENTILE = 0.95`.
  - New `mythicQuota(n)`.
  - New `selectComputedMythics(cards: { cardId, number, score, percentile, isEligible, wasMythic }[], quota): ReadonlySet<string>`. It applies D3 and D4.
  - `resolveEffectiveTier` takes `computed: ComputedTier`, `min`/`max: BoundTier | null`.
- `rarity-engine.ts`:
  - It computes band tiers as today, then `selectComputedMythics` over all cards. The quota is 0 under cold start.
  - The selected cards get `computedTier = 'mythic'`, before `resolveEffectiveTier`.
  - Input `previousComputedTier: ComputedTier | null`, which can now be Mythic. Hysteresis receives a previous Mythic as `'legendary'`, so the band math stays bounded.
- `moderation.ts`: `areTierBoundsValid(min, max)` uses `BoundTier`.

### 4.2 Domain — premium booster

- `booster-draw.ts`:
  - `DROP_TABLE_VERSION = 4` and `PREMIUM_SINCE_VERSION = 4`.
  - Exported `PREMIUM_BOOSTER_SLOTS = [CU, CU, CU, RARE_PLUS_PREMIUM, LEGENDARY_PLUS]` and `PREMIUM_SLOT_FLOORS`, as described in D12.
  - `drawBooster({ …, isPremium? })`: when `tableVersion >= 4 && isPremium`, it uses the premium weights and floors per slot. Otherwise the code path is unchanged.
  - `slotOddsPercent(weights): Partial<Record<CardTier, number>>` returns percents with one decimal.
- `pity.ts` (or a new `premium-booster.ts`; prefer the new file to keep `pity.ts` focused):
  - `PREMIUM_BOOSTER_EVERY = 20`.
  - `isPremiumBooster(boostersOpenedBefore)`.
  - `premiumSummary(boostersOpened): { boostersUntil, progress }`.

### 4.3 Data (`packages/db`)

- `member_wallets.boosters_opened integer not null default 0`, with a check ≥ 0 added to the existing non-negative checks (a new named check).
- `booster_openings.is_premium boolean not null default false`.
- Migration `0013_premium_booster`: generated, then the hand-appended backfill (D9) at the end of the generated SQL.
- `rarity-inputs.ts` casts `computedTier` to `ComputedTier`, which now includes Mythic, and `min`/`maxTier` to `BoundTier`.

### 4.4 API

- `boosters.service.ts` `openNewBooster`:
  - `isPremium = isPremiumBooster(wallet.boostersOpened)`.
  - It passes `isPremium` to `drawBooster` and `insertOpening` (`isPremium`).
  - The patch includes `boostersOpened: wallet.boostersOpened + 1`.
- `present` / `presentStored` return `isPremium` from the opening row.
- `boosters.repository.ts` and `wallets.repository.ts`: select and insert the new columns (Drizzle only).
- `wallet-state.ts`: `premium: premiumSummary(row.boostersOpened)`.
- Moderation:
  - `admin-card-view.ts` `asComputedTier` now accepts Mythic, plus a new `asBoundTier` for min/max.
  - The `filterCondition('mythic')` filter matches `cards.tier = 'mythic'`.
  - `countMythicPins` stays unchanged.
- Shared schemas:
  - `admin-cards.ts`: `computedTierSchema = z.enum(COMPUTED_TIERS)` for `computedTier`; a new `boundTierSchema = z.enum(BOUND_TIERS)` for min/max in the card view and the bounds body.
  - `wallet.ts`: `premium` object.
  - `boosters.ts`: `isPremium` on `boosterOpeningSchema`.

### 4.5 Web

- **Home** (`features/game/components/booster-widget.tsx`):
  - A `PremiumGauge` under `EpicGuarantee`, with a gold dot and a slim bar (`premium.progress`), and the copy from D18.
  - A "Probabilités" text button that opens a `BottomSheet` (`components/ui/bottom-sheet.tsx`).
  - `BoosterPack` takes `isPremium` and renders the gold wrapper when `premium.boostersUntil === 1`.
- **Odds sheet** (`features/game/components/booster-odds-sheet.tsx`):
  - Two sections, "Booster classique" and "Booster premium · 1 sur 20". Per slot ("Cartes 1 à 3", "Carte 4", "Carte 5"), it shows tier pills in rarity colours with their percents, from `slotOddsPercent`.
  - Footnotes:
    - « Épique garantie au plus tard au 10e booster sans Épique. »
    - « Après 25 boosters sans Légendaire, ses chances augmentent d'un point par booster. »
    - « Si ta ligue n'a pas encore de carte de la rareté tirée, tu reçois la meilleure disponible. »
    - « Chaque carte a 1 chance sur 15 d'être brillante. »
- **Opening** (`features/boosters`):
  - `ArcadePack` takes `isPremium`, which adds the `is-premium` modifier: a gold foil gradient, a gold halo, and the subtitle "Premium · 5 cartes".
  - `BoosterStage` passes `opening.isPremium`.
  - The pre-tear hint shows "Booster premium : Légendaire garantie".
  - The halo and the crack glow use the Legendary aura token from the Design System (`--tier-legendary` or its real name). There is no new colour outside the DS tokens.
- **Admin**: `tier-bounds-picker.tsx` iterates `BOUND_TIERS`. `admin-card-sheet` already shows "Calculée : Mythique" through `TIER_LABELS`.
- Reduced motion: the premium halo is static, with no shimmer animation.

## 5. Out of scope

- Per-league configuration of the premium cadence.
- A Mythic pity counter.
- Pity currency or wildcards.
- New sounds.
- Retroactive premium boosters for past openings.

## 6. Risks

- **Rarity churn:** the first recompute after deploy will promote 1+ card to Mythic in every league with 50+ active cards, and emit tier-change events and notifications for them. That is expected and desirable; mention it in the release notes later.
- **Tier type narrowing:** `ComputedTier` widening touches the admin bounds types. Typecheck is the guard, and every `ComputedTier` used as a bound must become `BoundTier`.
- **Replay:** v3 determinism is guarded by one unit test (same seed and pool give identical draws with `tableVersion: 3`, and with `isPremium: true`, because the flag is ignored before v4).
