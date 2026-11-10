# Storix — Wave 1: data surfaces (rarity journey, booster history, reactions)

Status: frozen 2026-11-10. Design source: artifact https://claude.ai/artifact/TBNfU3zdhuWhBBz1JMV6bc (local copy `scratchpad/wave1/vague-1.html`). Implementation must match the picked proposals exactly.

## 1. Goal

Surface three kinds of data Storix already stores but never shows:

| Id | Feature | Picked proposal | Data |
|---|---|---|---|
| I-01 | Rarity journey of a card | **C · "Son parcours"**: vertical dated timeline, at the bottom of the vitrine | `card_rarity_history` |
| I-02 | My booster history | **A · "Le relevé"**: 4 stat tiles, then openings grouped by day with their 5 mini-cards | `booster_openings`, `booster_pulls` |
| I-03 | Who reacted | **A · "Sous la carte"**: a "Réactions" bottom sheet from the vitrine, plus a "Plus aimées" collection sort | `reactions` |

## 2. Frozen user decisions

- I-01 sits at the BOTTOM of the vitrine page (after the actions). It is secondary: you scroll to it.
- Detail options = the artifact's recommendations:
  - I-01: section shown open but compact; admin changes say "choix de l'admin" with no name; a "Toi : Épique ★ le 9 nov." marker for the viewer's own personal upgrade; nothing on cards the viewer doesn't own.
  - I-02: entry points = "Historique" link in the home booster widget (next to "Probabilités") + a "Mes boosters" row in Profil; no luck gauge; pre-stacking boosters show "+20 paillettes" instead of "doublon"; a removed card stays as a mini-card marked "carte retirée".
  - I-03: reactor names visible to every member who can see the card's reactions; one row per person (their reaction pills + date of the latest); "Plus aimées" = plain total of the 3 types, ties broken by the most recent reaction; departed members appear as "Ancien membre".

## 3. Decisions made by the planner

| # | Decision | Why |
|---|---|---|
| D1 | Three new read-only GET endpoints, one per surface; no change to the card detail payload. | The journey and reactors load lazily (bottom of page / on sheet open); keeps the detail response small. |
| D2 | `GET /leagues/:leagueId/cards/:cardId/rarity-history` returns 404 unless the viewer owns a copy and the card is active, matching the vitrine's owned-only sections. | "Nothing on unowned cards"; same visibility as reactions today. |
| D3 | The journey is built by a pure helper `rarityJourney()` in `@storix/shared`: newest first, consecutive rows with the same `toTier` collapsed, the first ever row labelled "arrival". Cap 50 rows server-side (newest). | Recomputes can write repeated rows; the helper is the one piece of logic worth a test. |
| D4 | Cause wording from `source` + direction: first row → "arrivée dans la pioche"; `pinned`/`bounded` → "choix de l'admin" (pill "admin"); `computed` up → "montée au recalcul de la ligue"; `computed` down → "descendue au recalcul de la ligue". | The score mixes reactions, age and author share; claiming "les réactions l'ont fait monter" would be inaccurate. Same layout and tone as proposal C. |
| D5 | A card whose history has a single row shows one jalon "{Tier} depuis le {date}". Over 5 jalons, the rest folds behind "Voir tout" (artifact C). | Artifact edge cases. |
| D6 | The viewer's own upgrade marker comes from their copies' `promotedTier` / `promotedAt` (highest promoted copy). It is inserted in the timeline at its date as a distinct "Toi" jalon (★, personal tier colour), viewer only. | Personal tiers are not in league history. |
| D7 | `GET /leagues/:leagueId/boosters/history?cursor=&limit=` returns the viewer's openings in that league, newest first, cursor = `<openedAtMs>.<openingId>`, default limit 20, max 50. `stats` is returned only on the first page (no cursor). | Cursor pagination per constraints; stats are a fixed cost once. |
| D8 | Stats are SQL aggregates in the repository: openings count, premium count, best pull (highest `tier_at_mint`, then foil, then most recent) with its card, and boosters opened since the last opening holding a Legendary-or-better pull (`null` = never). | Four tiles of proposal A. |
| D9 | Each pull's card is rendered with the existing `withViewerCopies` + `toCollectionCard` path (as `/reveals` does): owned → real image; no longer owned (recycled/converted) → locked silhouette; `card_id` NULL (card removed, media deleted) → `card: null` and the UI shows a neutral mini-card "carte retirée" in the pull's tier colour. | Privacy rule: never send an image URL for a card the viewer doesn't own now. The thumbnail of a removed card no longer exists. |
| D10 | Pull outcome label: `new` → "nouvelle", `upgraded` → "améliorée", `duplicate` with `stack_count` → "doublon ×N", `duplicate` without `stack_count` and `dust > 0` → "+{dust} paillettes"; plus a "découverte" badge (N) when `is_discovery`. | Pre-stacking boosters (D-option) and existing data shapes. |
| D11 | New migration `0015_booster_history_index`: index `booster_openings (league_id, user_id, opened_at DESC, id DESC)`. No other schema change. | The only new query shape that would scan; `reactions` PK `(card_id, …)` and `card_rarity_history (card_id, computed_at DESC)` already serve the other reads. |
| D12 | `GET /leagues/:leagueId/cards/:cardId/reactions` returns the reactors of an active card the viewer owns: one row per person `{ person, types, lastReactedAt }`, newest first, plus the counts. A reactor who is no longer a member of the league → `person = { userId: null, displayUsername: null }` → "Ancien membre". | Same visibility as counts today (owned only). |
| D13 | On the vitrine, the ReactionBar keeps toggling reactions. A new summary line under it ("Léa, Tom et 3 autres ont réagi", up to 3 avatars) opens the sheet. When the viewer can't react (author), tapping a counter opens the sheet instead. Hidden when the total is 0. | Counters are already toggle buttons; this avoids breaking reacting. |
| D14 | "Réactions · N" sheet uses `BottomSheet`, tabs "Tous / 🔥 / ❤️ / ⭐" (client-side filter), avatars from the existing portraits map. Toggling a reaction invalidates the reactors query. | Matches artifact A. |
| D15 | New collection sort `reactions` ("Plus aimées", hint "Les plus réactées d'abord"), appended after "Numéro" with a "NOUVEAU" chip in the sort sheet. Order: total reactions DESC, latest reaction DESC NULLS LAST, number DESC. Cursor kind `reactions`: `r.<total>.<lastMs|0>.<number>`. Applies to all listed cards (locked ones keep hiding their counts). | Plain total per D-option; reuses the cursor framework. |
| D16 | GET routes follow existing read routes: `authenticate` + `requireLeagueRole('member')`, Zod params/query/response, no extra rate limit (as `/reveals` and card detail). | Consistency with existing reads. |
| D17 | Web: I-02 page = route `/l/$leagueId/profile/boosters` built on `ProfileSubPage` (title "Mes boosters", subtitle league name); the widget's "Historique" link navigates there. Days grouped client-side in Europe/Paris ("Aujourd'hui", "Hier", "8 nov."). Infinite scroll via TanStack `useInfiniteQuery`. Tapping a booster expands its rows (title, tier, outcome); tapping a card opens its vitrine (locked/removed: not tappable). | Matches artifact A; reuses profile sub-page chrome. |
| D18 | Tests: only `rarityJourney()` (collapse, arrival, admin cause, down move) and the `reactions` cursor encode/parse round-trip. | Few tests on pure domain. |

## 4. Design

### 4.1 Shared (`packages/shared`)
- `domain/rarity-journey.ts`: `rarityJourney(rows, mine?) → JourneyStep[]` with `{ kind: 'league' | 'mine', tier, at, cause: 'arrival' | 'admin' | 'up' | 'down' }`.
- `domain/collection-cursor.ts`: add `'reactions'` to `COLLECTION_SORTS`, cursor kind `reactions`, encode/parse/`cursorSort`.
- `schemas/cards.ts` (or new files): `rarityHistorySchema`, `cardReactorsSchema`.
- `schemas/booster-history.ts`: `boosterHistoryQuerySchema`, `boosterHistoryPageSchema` (`stats | null`, `openings[]`, `nextCursor`).

### 4.2 API
- Cards feature: route + service method `getRarityHistory`, repository `rarity-history.repository.ts`.
- Reactions feature: route + service `listReactors`, repository `listReactors`.
- Cards repository: `reactions` sort (order, cursor, `nextCollectionCursor`).
- Boosters feature: `booster-history.repository.ts` (page + stats), service `listHistory`, route.

### 4.3 Web
- I-01 `features/cards/components/rarity-journey.tsx` + `use-rarity-history.ts`, appended at the end of `card-detail.tsx`.
- I-03 `reactions-sheet.tsx`, `reactors-summary.tsx`, `use-card-reactors.ts`; ReactionBar change (D13); sort label in `collection-sort-labels.ts`; "NOUVEAU" chip in `sort-sheet.tsx`.
- I-02 `features/booster-history/` (`booster-history.api.ts`, `booster-history.queries.ts`, `components/history-stats.tsx`, `components/history-day.tsx`, `components/history-opening.tsx`), route `l.$leagueId.profile.boosters.tsx`, "Historique" link in `booster-widget.tsx`, "Mes boosters" row in `l.$leagueId.profile.index.tsx`.
- Styles in existing CSS files, Design System tokens only; mythic = purple + rainbow ring (`.t-M`, with `position: relative` on the host).

## 5. Out of scope
Luck gauge, notifications about reactions (I-04 rejected), member pages (wave 2), league feed (wave 3), showing journeys on locked cards.

## 6. Risks
- **Parallel branch `fix/collection-filters-persist`** touches the collection filters/sort state, `filter-sheet.tsx` and `bottom-sheet.tsx` (footer slot). Rebase wave 1 on main after it merges; the persisted sort must accept the new `reactions` value (it validates with the shared schema, so it will once rebased). `sort-sheet.tsx` / `collection-sort-labels.ts` may conflict trivially.
- Authors who never pulled their own card see it locked, so they cannot open its reactors (existing rule: the author doesn't auto-own). Out of scope; noted for wave 2 (member pages).
- `reactions` sort aggregates reactions per card on each page request: fine for 5-30 member leagues; revisit if a league grows past a few thousand cards.
- History of very old openings (table version 1) may have pulls whose `card_id` is NULL: covered by D9.
