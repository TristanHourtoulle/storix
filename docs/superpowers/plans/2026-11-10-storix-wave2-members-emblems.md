# Storix wave 2 — implementation plan (member pages, Sur la photo, emblems)

Spec: `docs/superpowers/specs/2026-11-10-storix-wave2-members-emblems.md` (decisions D1-D21).
Branch `feat/wave2-members-emblems`, worktree `../storix-wave2`. **Before T1: rebase onto `main` after wave 1 merges** (migration 0015, reactions sheet, booster history are prerequisites). Migration number: 0016.

Rules for every task: English code, basic JSDoc only, no inline comments, no `any`; routes HTTP only, services = use cases, repositories = DB only, pure rules in `packages/shared`; Zod at boundaries; French copy; Storix Design System tokens; UI matches artifact proposals A exactly (`scratchpad/wave2/vague-2.html`), diff markup/CSS against it, create missing primitives instead of substituting. Don't boot Docker, don't `db:push`/`db:migrate`, don't edit `.env`. Verify each task with root `pnpm typecheck` + `pnpm lint` (+ tests when touched). One commit per task.

## Task 1 — Shared domain: emblems + showcase (D1-D3, D8, D9, D21)
Files: `packages/shared/src/domain/emblems.ts`, `emblems.test.ts`, `showcase.ts`, `domain/index.ts`.
- `EMBLEM_IDS` (15 kebab ids), `EMBLEM_CATALOGUE` (id, name, rule copy FR, tier, metric key, target), `EmblemStats` (boostersOpened, premiumOpened, photosPosted, distinctOwned, activeCards, reactionsGiven, discoveries, stackedTotal, foilCards, maxReactionsOnOwnPhoto, promotedCopies, legendaryPulls, mythicPulls, ownMythicPhotos), `evaluateEmblems(stats)` → `{ id, progress, target, isEarned }[]` (progress capped at target; Archiviste earned only when activeCards ≥ 20; Doré progress = min(boostersOpened, 20)/20 until premiumOpened ≥ 1).
- `featuredFallback(earned: {id, earnedAt}[])` → 3 ids, rarest tier then latest.
- `SHOWCASE_SLOTS`, `resolveShowcase(savedCardIds, ownedRanked)` → ≤ 6 unique ids: saved ones still owned, then auto-fill from ranked.
- Tests (≤ 6): threshold hit/miss, Archiviste minimum, Doré progress, Muse, resolveShowcase drops stale + auto-fills.
Acceptance: shared tests green.

## Task 2 — Shared schemas (D10-D17) — after T1
Files: `packages/shared/src/schemas/emblems.ts`, `member-profile.ts`, `showcase.ts`, `cards.ts`, tagged-card schema file (where `TaggedCard` lives), `schemas/index.ts`.
- `emblemProgressSchema`, `memberEmblemsSchema`, `unseenEmblemsSchema`, `markEmblemsSeenBodySchema`, `featuredEmblemsBodySchema` (≤ 3 unique ids in `EMBLEM_IDS`).
- `memberProfileSchema` (header, stats with optional `completionPercent`, `showcase: collectionCardSchema[]`, tab counts).
- `saveShowcaseBodySchema` (≤ 6 unique uuids).
- `listCardsQuerySchema`: `taggedUserId: idSchema.optional()`, `revealOwn: z.stringbool().optional()`; `unpulledCardSummarySchema` (strict: id, number, title, tier, author, thumbhash, dominantColor, width, height, image, `kind: 'unpulled'`) added to `collectionCardSchema`.
- Tagged card: `taggedAt` iso date.
Acceptance: shared typecheck; list the expected downstream type errors.

## Task 3 — DB tables + migration 0016 (D7, D9, D14) — parallel with T2
Files: `packages/db/src/schema/emblems.ts`, `schema/showcase.ts`, `schema/cards.ts` (card_tags columns), `schema/index.ts`, generated `drizzle/0016_*.sql` + snapshot + journal.
- Hand-add to the SQL, after the ALTER: `UPDATE "card_tags" SET "created_at" = '2000-01-01T00:00:00Z';`.
Acceptance: `db:generate` clean afterwards ("No schema changes"), db typecheck.

## Task 4 — DB queries: stats + award (D4) — after T1, T3
Files: `packages/db/src/queries/emblems.ts`, `packages/db/src/index.ts`.
- `loadEmblemStats(db, { leagueId, userId })`: one select with scalar subqueries (boosters from `member_wallets.boosters_opened`, premium from `booster_openings.is_premium`, photos = active cards authored, distinct owned from `card_copies`, active cards count, reactions given on league cards, discoveries, sum of stack counts, distinct foil cards, max reactions on an own card, promoted copies, pulls ≥ legendary / = mythic joined via openings of the user, own mythic photos).
- `awardEarnedEmblems(db, { leagueId, userId, now })` → newly inserted ids (insert … on conflict do nothing returning).
Acceptance: db typecheck; a read-only run against the local DB prints stats for a member (script in scratchpad, not committed).

## Task 5 — API emblems + awards (D5, D17, D18) — after T2, T4
Files: `apps/api/src/features/emblems/{emblems.routes,emblems.service,emblems.repository}.ts`, `apps/api/src/app.ts` / `deps.ts` registration, `http/rate-limit.ts` (`emblemsSeen`, `profileEdit`), award calls in `features/boosters/boosters.service.ts` (opener, after the wallet update), `features/reactions/reactions.service.ts` (on add: reactor + card author when author is a current member), `features/copies/stacks.service.ts` (promotion), `features/copies/copies.service.ts` (foil upgrade).
- Routes: `GET /leagues/:leagueId/members/:userId/emblems` (404 if not a current member), `GET /leagues/:leagueId/emblems/unseen`, `POST /leagues/:leagueId/emblems/seen`, `PUT /leagues/:leagueId/emblems/featured` (only earned ids; rewrites featured_rank in one transaction).
Acceptance: api typecheck; curl smoke documented in the report (after local migrate in T12).

## Task 6 — API cards: Sur la photo filter, revealOwn, self-tag (D11, D13, D15, D16) — after T2, T3; parallel with T5
Files: `apps/api/src/features/cards/{cards.repository,cards.service,card-views}.ts`, `apps/api/src/features/tags/{tags.routes,tags.service,tags.repository}.ts`, `features/withdrawals/withdrawals.repository.ts` (taggedAt), registration.
- `collectionWhere`: `taggedUserId` exists-subquery; count respects it.
- `revealOwn` honoured only when `authorId === viewerId`: locked rows authored by the viewer → `toUnpulledSummary` (signed image, title). Never otherwise.
- Tags: POST self-tag (owns active copy, card active, not tagged, < 30 tags, `tagged_by_id` = self); DELETE (self, author, admin). `cardAction` rate limit.
Acceptance: api typecheck; privacy reasoning in the commit body (who can get `unpulled`).

## Task 7 — API member profile + showcase (D9, D10) — after T2, T3; parallel with T5, T6
Files: `apps/api/src/features/members/{member-profile.service,member-profile.repository}.ts`, `members.routes.ts` (GET profile), `apps/api/src/features/showcase/{showcase.routes,showcase.service,showcase.repository}.ts`, registration.
- Profile: 404 for non-members; stats; `completionPercent` only for self; showcase via `resolveShowcase` with owned cards ranked (display tier desc, foil first, number asc), mapped to viewer-relative summaries with the existing card views (locked for cards the viewer doesn't own); featured emblems (`featuredFallback` when none chosen); tab counts.
- Showcase PUT validates ownership + active, replaces rows in a transaction; DELETE resets. `profileEdit` rate limit.
Acceptance: api typecheck.

## Task 8 — Worker emblem job (D5, D6) — after T4; parallel with T5-T7
Files: `apps/worker/src/features/emblems/emblems-evaluate.service.ts`, `apps/worker/src/jobs/emblems-evaluate.job.ts`, `packages/shared/src/schemas/jobs.ts` (job name + payload), `apps/worker/src/main.ts` (register + boot enqueue per league, singleton key), enqueue in `features/media/card-publish.service.ts` (after publish) and `features/rarity/rarity-recompute.service.ts` (after recompute).
Acceptance: worker typecheck; boot log line shows leagues enqueued (checked in T12).

## Task 9 — Web data layer (all features) — after T2
Files: `apps/web/src/features/emblems/{emblems.api,emblems.queries,use-member-emblems,use-unseen-emblems,use-featured-emblems}.ts`, `apps/web/src/features/members/{member-profile.api,use-member-profile,use-save-showcase}.ts`, `apps/web/src/features/cards/{cards.api,collection-filters,use-persisted-collection-filters}.ts` (`taggedUserId` → URL `tagged`, persisted), self-tag mutation hook, invalidation of `unseen emblems` after booster opening, reaction toggle, promotion, foil upgrade, upload publish.
Acceptance: web typecheck.

## Task 10 — Web member page + list + showcase editor (I-06) — after T9
Files: routes `apps/web/src/routes/_authed/l.$leagueId.members.index.tsx`, `l.$leagueId.members.$userId.tsx` (search `tab`), `apps/web/src/features/members/components/{member-header,member-stat-tiles,member-showcase,member-tabs,showcase-editor-sheet,member-list}.tsx`, `apps/web/src/styles/member-page.css`, `features/cards/components/` card face for `unpulled` ("Pas encore tirée"), Profil rows "Membres" + "Emblèmes x/15" in `l.$leagueId.profile.index.tsx`, entry links in `reactions-sheet.tsx`, `recent-reveals.tsx`, card vitrine author line (former members not linked).
- Tabs: Photos (collection grid, `authorId` + `revealOwn` on own page), Avec <membre> (collection grid with `taggedUserId` + "Voir dans la Collection"), Emblèmes (T11 grid).
Acceptance: web typecheck + build; artifact diff noted.

## Task 11 — Web emblems grid, sheet, banner (I-30) — after T9; parallel with T10 (different folders; T10 imports the grid at the end)
Files: `apps/web/src/features/emblems/components/{emblem-grid,emblem-tile,emblem-sheet,emblem-unlock-banner,emblem-gate}.tsx`, `apps/web/src/styles/emblems.css`, `apps/web/src/routes/_authed/l.$leagueId.tsx` (gate mounted, suspended with booster stage / onboarding / whats-new), sound via existing `stamp`.
- Grid 3 columns: earned (colour + date) first, then locked grey with progress bar; sheet with rule, date or progress, "Mettre en avant" toggle on own page (max 3).
- Banner: 1 unseen → named, several → "Tu as débloqué N emblèmes"; 4 s; tap → own page emblems tab; marks seen.
Acceptance: web typecheck + build.

## Task 12 — Web Sur la photo filter + self-tag + tag dot (I-07) — after T9; parallel with T10/T11
Files: `apps/web/src/features/cards/components/{filter-sheet,tagged-filter,active-filter-tokens,more-actions-sheet}.tsx`, Profil row dot (`profile.index.tsx` — coordinate with T10: T12 runs after T10 if both touch it), `features/withdrawals/use-tagged-cards.ts` last-seen storage, `lib/storage.ts` key.
Acceptance: web typecheck + build.

## Task 13 — Verification (orchestrator + check agents)
- Rebase check, root typecheck/lint/tests/build.
- Local `db:migrate` (0016), Portly servers on this worktree, worker boot backfill observed.
- Context-free review (privacy of `unpulled` + showcase + tags, authz on every new route, award idempotency, layering).
- Chrome E2E 390 px: member page (self vs other, tabs, showcase edit/reset, former member not linked), Sur la photo filter (+ persistence, count, token, combos), self-tag add/remove + author/admin removal, tag dot, emblems (bulk banner after boot, single unlock after a booster/reaction, sheet, featured 3, banner suspended during booster stage/onboarding).

## Parallelism summary
T1 → (T2 ∥ T3) → T4 → (T5 ∥ T6 ∥ T7 ∥ T8) → T9 → (T10 ∥ T11), then T12 → T13.
Files touched by two tasks: `profile.index.tsx` (T10, T12 → serial), `app.ts`/`deps.ts` registration (T5, T6, T7 → one agent or serial), `cards.api.ts` (T9 only).
