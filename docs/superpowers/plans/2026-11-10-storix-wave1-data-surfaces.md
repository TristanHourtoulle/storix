# Storix — Wave 1 data surfaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax.
>
> **Commits:** each task ends with a commit step that runs ONLY when the orchestrator says so. Without that go-ahead, stop at the commit step and report.

**Goal:** I-01 rarity journey (proposal C) at the bottom of the vitrine, I-02 booster history (proposal A "Le relevé"), I-03 reactors sheet + "Plus aimées" sort (proposal A).

**Spec:** `docs/superpowers/specs/2026-11-10-storix-wave1-data-surfaces.md` — decisions D1…D18. Read it fully first.

**Design source:** artifact https://claude.ai/artifact/TBNfU3zdhuWhBBz1JMV6bc, local HTML `/private/tmp/claude-501/-Users-tristanhourtoulle--paradev-sessions-victorious-hamster-f823c5be/ff466f9b-8cfa-4957-a0b3-c205181e635e/scratchpad/wave1/vague-1.html`. Web tasks diff their markup/CSS against the picked proposal (I-01 C, I-02 A, I-03 A) and reproduce it exactly; flag any unavoidable deviation.

**Design system:** https://claude.ai/artifact/PnujcYudoKxB6yCvdwWchz (`project/README.md`).

**Branch / worktree:** `feat/wave1-data-surfaces`, worktree `/Users/tristanhourtoulle/.paradev/sessions/storix-wave1`, off `origin/main` 3633918.

## Global constraints
- Node 24 (`source ~/.nvm/nvm.sh && nvm use 24`). No new dependency.
- TypeScript strict, no `any`, immutable data, Zod at boundaries. NO comments except basic JSDoc on exported functions. English code, French UI copy.
- Layering: routes = HTTP only, services = use cases, repositories = DB only, pure logic in `packages/shared`.
- Privacy: never return an image URL for a card the viewer doesn't currently own (reuse `withViewerCopies` + `toCollectionCard`).
- Tests: only those listed (D18). No CI.
- Don't boot the stack, Docker, `db:push`/`db:migrate`, seed or edit `.env` unless the task says so.
- Verification for every task: `pnpm typecheck`, `pnpm lint`, and `pnpm --filter @storix/shared exec vitest run` when shared changed.

## Parallelism map
- **T1** (shared) and **T2** (db index) in parallel.
- After T1: **T3** (api I-01), **T4** (api I-03 reactors), **T5** (api sort), **T6** (api I-02) touch disjoint files → can run in parallel. T3 and T5 both live in `features/cards` but T3 only touches `cards.routes.ts`, `cards.service.ts`, new `rarity-history.repository.ts`; T5 only `cards.repository.ts`, `card-views.ts`.
- After their API task: **T7** (web I-01) → **T8** (web I-03) serially (both edit `card-detail.tsx`); **T9** (web I-02) in parallel with T7/T8.
- **T10** verification last.

## Task 1 — Shared domain + contracts (spec §4.1, D3, D4, D7, D9, D10, D12, D15, D18)
**Files:**
- Create `packages/shared/src/domain/rarity-journey.ts` (+ `rarity-journey.test.ts`).
- Modify `packages/shared/src/domain/collection-cursor.ts` (+ add 1 round-trip case to the existing cursor test file if one exists, else create `collection-cursor.test.ts` with that single case).
- Create `packages/shared/src/schemas/booster-history.ts`.
- Modify `packages/shared/src/schemas/cards.ts` (rarity history + reactors schemas), `packages/shared/src/schemas/index.ts`, `packages/shared/src/domain/index.ts`.

**Steps:**
- [ ] `rarityJourney(rows: { fromTier: CardTier | null; toTier: CardTier; source: TierSource; computedAt: Date | string }[], mine: { tier: CardTier; at: Date | string } | null): JourneyStep[]` per D3/D4/D6: sort oldest→newest, collapse consecutive equal `toTier`, first row cause `arrival`, `pinned`/`bounded` → `admin`, else `up`/`down` by `tierRank`; insert `mine` as `kind: 'mine'` at its date; return newest first.
- [ ] Tests (4 cases max): collapse of repeated tiers; arrival + up; admin cause; mine inserted at its date.
- [ ] `COLLECTION_SORTS` gains `'reactions'`; cursor kind `{ kind: 'reactions'; total: number; lastReactedAt: number; number: number }`, prefix `r`, encode `r.<total>.<ms|0>.<n>`, parse with the existing digit guards (total ≤ 1_000_000), `cursorSort` maps it.
- [ ] Schemas:
  - `rarityHistorySchema = { steps: { kind, tier, at, cause }[] }` (max 60).
  - `cardReactorsSchema = { counts: reactionCountsSchema, reactors: { person: cardPersonSchema, types: reactionTypeSchema[] (1-3), lastReactedAt: isoDate }[] }`.
  - `boosterHistoryQuerySchema = { cursor?: string (regex `^\d{1,15}\.[0-9a-f-]{36}$`), limit: coerce int 1-50 default 20 }`.
  - `boosterHistoryPageSchema = { stats: { openedCount, premiumCount, bestPull: { tierAtMint, variant, card: collectionCardSchema | null } | null, boostersSinceLegendary: number | null } | null, openings: { id, openedAt, isPremium, pulls: { slot, tierAtMint, variant, outcome: 'new'|'upgraded'|'duplicate', dust, stackCount: number | null, isDiscovery, card: collectionCardSchema | null }[] }[], nextCursor: string | null }`.
- [ ] Verify + commit `feat(shared): add wave 1 journey, reactors and booster history contracts`.

**Acceptance:** shared typecheck + tests green; api/web compile except for exhaustive `switch` on `CollectionSort`/cursor kinds (list them for T5).

## Task 2 — DB index (D11) — parallel with T1
**Files:** `packages/db/src/schema/boosters.ts`, generated `packages/db/drizzle/0015_*.sql` + meta.
- [ ] Add `index('booster_openings_member_opened_idx').on(t.leagueId, t.userId, t.openedAt.desc(), t.id.desc())`.
- [ ] `pnpm --filter @storix/db db:generate` (drizzle-kit, no DB) → rename to `0015_booster_history_index.sql` if the tool allows a name flag; check the journal.
- [ ] Verify + commit `feat(db): index booster openings per member`.

**Acceptance:** one `CREATE INDEX` statement, journal has 16 entries, worker `MIGRATION_JOURNAL_ENTRY_COUNT` follows the journal automatically (check).

## Task 3 — API I-01 rarity history (D1, D2, D3, D6, D16) — after T1
**Files:** create `apps/api/src/features/cards/rarity-history.repository.ts`; modify `cards.routes.ts`, `cards.service.ts`.
- [ ] Repository: `listRarityHistory(db, { cardId, limit: 50 })` newest first from `card_rarity_history`; `findViewerPromotion(db, { leagueId, cardId, ownerId })` → highest `promotedTier` + its `promotedAt` from `card_copies`, or null.
- [ ] Service `getRarityHistory(m, cardId)`: `findCardForViewer`; 404 unless owned and active; returns `{ steps: rarityJourney(rows, mine) }`.
- [ ] Route `GET /leagues/:leagueId/cards/:cardId/rarity-history` (authenticate, member, `cardParamsSchema`, response `rarityHistorySchema`).
- [ ] Verify + commit `feat(api): serve a card's rarity journey`.

**Acceptance:** curl as owner → steps; as non-owner → 404.

## Task 4 — API I-03 reactors (D12, D16) — after T1
**Files:** `apps/api/src/features/reactions/reactions.repository.ts`, `reactions.service.ts`, `reactions.routes.ts`.
- [ ] Repository `listReactors(db, { leagueId, cardId })`: group `reactions` by `user_id`, `array_agg(type)`, `max(created_at)`, left join `user` + `league_members` (current membership) → person null when not a member; order by `max(created_at)` DESC.
- [ ] Service `listReactors(m, cardId)`: same visibility as counts (card active and viewer owns a copy, via `findCardForViewer` + `isOwned`); returns `{ counts: countReactions(...), reactors }`.
- [ ] Route `GET /leagues/:leagueId/cards/:cardId/reactions` (no rate limit, D16; existing PUT/DELETE keep theirs).
- [ ] Verify + commit `feat(api): list who reacted to a card`.

## Task 5 — API "Plus aimées" sort (D15) — after T1
**Files:** `apps/api/src/features/cards/cards.repository.ts`, `apps/api/src/features/cards/card-views.ts`.
- [ ] A league-scoped subquery `cardReactionStats` (`card_id`, `count(*)::int total`, `max(created_at) last_at`) left-joined in `listCollection` only (not in `countCollection`); expose `reactionTotal`/`lastReactedAt` on the row.
- [ ] `orderFor('reactions')`: `coalesce(total,0) DESC, last_at DESC NULLS LAST, number DESC`; `afterCursor` for kind `reactions` (row comparison with `coalesce(extract(epoch from last_at)*1000, 0)`); `nextCollectionCursor('reactions')`.
- [ ] Verify + commit `feat(api): sort the collection by reactions`.

**Acceptance:** paging through the sort with limit 2 returns every card once, in order.

## Task 6 — API I-02 booster history (D7, D8, D9, D10, D16) — after T1 (T2 for perf only)
**Files:** create `apps/api/src/features/boosters/booster-history.repository.ts`, `booster-history.service.ts` (or a method in `boosters.service.ts` if the factory pattern requires; prefer a separate service wired in the app like other features), modify `boosters.routes.ts` and the app wiring file that registers services.
- [ ] Repository: `listOpeningsPage(db, { leagueId, userId, after?: { openedAt, id }, limit })` (limit+1), `listPullsWithCards(db, openingIds)` joining card media columns like `listRecentReveals`, `historyStats(db, { leagueId, userId })` per D8.
- [ ] Service: maps pulls through `withViewerCopies` + `toCollectionCard` (D9), `card: null` when `card_id` is NULL; stats only when no cursor; builds `nextCursor`.
- [ ] Route `GET /leagues/:leagueId/boosters/history` with `boosterHistoryQuerySchema`.
- [ ] Verify + commit `feat(api): serve the member's booster history`.

**Acceptance:** an old v1 opening with converted duplicates returns `stackCount: null, dust: 20`.

## Task 7 — Web I-01 journey (D5, D6) — after T3
**Files:** create `apps/web/src/features/cards/components/rarity-journey.tsx`, `apps/web/src/features/cards/use-rarity-history.ts`; modify `cards.api.ts`, `card-detail.tsx` (append after `<CardActions/>`), styles (`apps/web/src/styles/` card detail CSS).
- [ ] Section title "Son parcours", meta "du plus récent"; jalons: coloured dot (tier), tier name, line "{date} · {cause}", "admin" pill for admin; "Toi" jalon with ★ in personal tier colour; >5 → "Voir tout" toggle; single step → "{Tier} depuis le {date}".
- [ ] Loading: skeleton of 2 jalons; error: hide the section silently.
- [ ] Verify + commit `feat(web): show a card's rarity journey`.

## Task 8 — Web I-03 reactors + sort (D13, D14, D15) — after T4, T5, T7
**Files:** create `reactions-sheet.tsx`, `reactors-summary.tsx`, `use-card-reactors.ts` in `apps/web/src/features/cards/`; modify `reaction-bar.tsx`, `card-detail.tsx`, the reactions mutation hook (invalidate reactors), `cards.api.ts`, `collection-sort-labels.ts`, `sort-sheet.tsx` ("NOUVEAU" chip on the `reactions` option).
- [ ] Summary line with up to 3 avatars ("Léa, Tom et 3 autres ont réagi"), hidden at 0; opens the sheet.
- [ ] Sheet "Réactions · N", tabs Tous/🔥/❤️/⭐ with counts, one row per person (avatar, name or "Ancien membre", reaction pills, relative date).
- [ ] Author (can't react): counters open the sheet.
- [ ] Verify + commit `feat(web): show who reacted and sort by reactions`.

## Task 9 — Web I-02 history page (D17) — after T6, parallel with T7/T8
**Files:** create `apps/web/src/features/booster-history/{booster-history.api.ts,booster-history.queries.ts,components/history-stats.tsx,components/history-day.tsx,components/history-opening.tsx}`, route `apps/web/src/routes/_authed/l.$leagueId.profile.boosters.tsx`; modify `apps/web/src/features/game/components/booster-widget.tsx` ("Historique" link next to "Probabilités"), `apps/web/src/routes/_authed/l.$leagueId.profile.index.tsx` ("Mes boosters" row), styles.
- [ ] 4 tiles: "boosters ouverts", "boosters premium", best card tier + "meilleure carte · « titre »", "boosters depuis ta dernière Légendaire" (never → "Aucune Légendaire pour l'instant").
- [ ] Day groups (Europe/Paris), each opening: "Premium · 14:02" (gold) or "Booster · 09:10", "5 cartes ›", 5 mini-cards (tier colours, foil shine, N badge, removed → "carte retirée"); tap expands rows (title, tier, outcome label D10); card tap → vitrine.
- [ ] Infinite scroll (`useInfiniteQuery`, IntersectionObserver sentinel), empty state "Aucun booster ouvert pour l'instant".
- [ ] Verify + commit `feat(web): add my booster history`.

## Task 10 — Verification (orchestrator + check agents)
- [ ] Rebase on main if `fix/collection-filters-persist` merged; resolve sort-sheet/labels conflicts.
- [ ] Context-free review vs this plan + spec.
- [ ] Local: apply 0015, Chrome E2E at 390px: journey on owned/unowned/single-step card, own ★ marker; history stats, paging, removed card, old dust pulls, widget + Profil entries; reactors sheet tabs, departed member, author path, "Plus aimées" paging + persisted sort.
- [ ] Merge + deploy per Storix rules, then stop and wait for the user's go for wave 2.
