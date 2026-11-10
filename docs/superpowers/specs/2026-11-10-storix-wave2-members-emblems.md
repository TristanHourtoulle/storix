# Storix — Wave 2: member pages, "Sur la photo", emblems

Date: 2026-11-10. Status: frozen scope (user picks), decisions below made by the planner.
Design source: wave 2 artifact https://claude.ai/artifact/THi1YkPeibUqtrUkWGxbqy (local copy `scratchpad/wave2/vague-2.html`). Picks: **I-06 = A "Le classeur"**, **I-07 = A "Le filtre Sur la photo"**, **I-30 = A "La grille"**. The UI must match these proposals exactly (layout, tiles, tabs, sheet, banner); any unavoidable deviation is flagged before commit.

Base: this branch is planned on top of wave 1 (`feat/wave1-data-surfaces`: reactions sheet, avatar sizes `xs`/`compact`, booster history, rarity journey, "Plus aimées" sort, migration 0015). It is rebased on `main` once wave 1 merges. New migrations start at **0016**.

## 1. Goal

Make the league's people visible and give collecting long-term goals:

- **I-06** a page per member: who they are, what they posted, what they found, six cards they show off.
- **I-07** hunt the photos you (or a friend) appear on, straight from the Collection.
- **I-30** fifteen emblems that reward what members already do, with a small unlock moment.

## 2. Frozen user decisions (2026-11-10)

| Feature | Pick | Detail options adopted (artifact recommendations) |
|---|---|---|
| I-06 | A · Le classeur | Showcase auto-filled with the 6 best owned cards until the member customises it; the author sees their own not-yet-pulled photos **clear** with "Pas encore tirée", only on their own page; others see counts, not percentages (the % stays on your own page); a "Membres" row in Profil; departed members have no page. |
| I-07 | A · Filtre « Sur la photo » | Locked cards stay blurred in the Collection and on member pages (the "Photos où tu apparais" withdrawal screen stays clear, unchanged); a member can tag themselves ("Je suis dessus") on cards they own, the author and admins can remove it; no push, a dot on the Profil "Photos où tu apparais" row when a new tag arrives. |
| I-30 | A · La grille | Emblems per league; bulk award at launch with a single "Tu as débloqué N emblèmes" announcement; simple emblems (no tiers); nothing secret (rule and progress always visible); evaluated after each relevant action. |

## 3. Decisions made by the planner

| # | Decision | Why |
|---|---|---|
| D1 | Emblem catalogue lives in `packages/shared/src/domain/emblems.ts` as data (id, name, rule copy, tier colour, metric, target) + a pure `evaluateEmblems(stats)` returning per emblem `{ id, progress, target, isEarned }`. | One source of truth for API, worker and web copy; testable without DB. |
| D2 | Catalogue (15, artifact names, thresholds confirmed): Premier booster (common, 1 booster), Premier cliché (common, 1 photo), Photographe (uncommon, 10 photos), Collectionneur (uncommon, 25 distinct cards owned), Fan club (uncommon, 30 reactions given), Doré (rare, 1 premium booster; progress shown as boosters opened / 20), Découvreur (rare, 10 discoveries), Brillant (rare, 5 distinct foil cards), Coup de cœur (rare, one own photo with ≥ 10 reactions), Empileur (epic, 100 stacked duplicates currently held), Améliorateur (epic, 3 promoted copies), Légende (legendary, 1 pull at Legendary or better), Archiviste (legendary, own ≥ 80 % of the league's active cards, only when the league has ≥ 20 active cards), Mythique (mythic, 1 Mythic pull), Muse (mythic, one own photo is Mythic). | Matches the artifact list; Archiviste minimum avoids a trivial emblem in a 5-card league. |
| D3 | Emblems are **insert-only**: once earned they stay even if the metric later drops (dust conversion, card removal). | Predictable, no "lost badge" feeling. |
| D4 | Stats are read by one SQL query with scalar subqueries, `loadEmblemStats(db, { leagueId, userId })`, and awards by `awardEarnedEmblems(db, { leagueId, userId })` (insert … on conflict do nothing, returns newly earned ids). Both live in `packages/db/src/queries/emblems.ts` so the API and the worker share them. | The worker creates cards and recomputes rarity; the API handles user actions. Same code path for both. |
| D5 | **Where awards run:** API — inside the same transaction as booster opening (opener), reaction add (reactor + card author), promotion and foil upgrade (actor), self-tag (no emblem, skipped). Worker — new job `emblems.evaluate-league` (all current members of a league) enqueued after a card is published and after each rarity recompute (Muse, Archiviste), plus once per league at worker boot (singleton key per league). | Immediate banner for user actions; catch-up for worker-side events; boot run = launch backfill and self-healing. |
| D6 | **Launch backfill** = the boot job (D5), not a migration. Members get all already-earned emblems as unseen; the client shows one "Tu as débloqué N emblèmes" banner when more than one is unseen. | Safe for prod (idempotent, retryable, no long migration lock); bulk announcement falls out of the unseen rule. |
| D7 | Table `member_emblems(league_id, user_id, emblem_id text, earned_at, seen_at null, featured_rank smallint null)`, PK (league, user, emblem), FK (league, user) → `league_members` on delete cascade, check `featured_rank between 1 and 3`, partial unique (league, user, featured_rank) where featured_rank is not null. `emblem_id` is validated against the catalogue in code (no pg enum, so adding an emblem needs no migration). | Per-league per member; featured choice stored on the row. |
| D8 | Featured header emblems: the member picks up to 3 (toggle "Mettre en avant" in the emblem sheet on their own page). Until they choose, the header shows their 3 rarest earned emblems (rarity desc, earned_at desc). | Artifact: "Tu choisis 3 emblèmes à mettre en avant". |
| D9 | Table `member_showcase(league_id, user_id, slot smallint 1..6, card_id uuid → cards on delete cascade)`, PK (league, user, slot), unique (league, user, card_id), FK member cascade. Saving validates every card is owned by the member (any active copy) and active. On read, slots whose card is no longer owned/active are dropped, then the remainder is **auto-filled** with the best owned cards (display tier desc, foil first, number asc) so others never see an empty slot. "Réinitialiser" deletes the rows (back to auto). | Matches "remplir automatiquement … jamais d'emplacements vides chez les autres". |
| D10 | Member page payload `GET /leagues/:leagueId/members/:userId/profile`: header (displayUsername, avatar, joinedAt, bestTier, featured emblems), stats (photosPosted, cardsOwned, discoveries, bestTier; plus `completionPercent` only when viewer = member), showcase (6 viewer-relative `CollectionCard` summaries: owned / locked / hidden as today), tab counts (photos, tagged, emblemsEarned / 15). 404 when the user is not a current member. | One request for the page above the tabs. |
| D11 | Photos tab = existing collection endpoint with `authorId`. New optional query flag `revealOwn=true`, honoured **only** when `authorId === viewer`: rows authored by the viewer that they don't own come back as a new summary kind `unpulled` (image + title, `kind: 'unpulled'`), rendered with the "Pas encore tirée" mention. Everywhere else (normal Collection, others' pages) nothing changes. Server enforces it; the web never infers it. | Fixes the locked-own-card issue without leaking anything: it is the viewer's own photo. |
| D12 | "Avec <membre>" tab = collection endpoint with new `taggedUserId` filter, inline grid on the member page (same grid component, paginated) + a "Voir dans la Collection" button that opens the Collection with that filter. | Same mechanism as I-07; no second listing. |
| D13 | I-07 filter: `listCardsQuerySchema.taggedUserId` → `exists (select 1 from card_tags where card_id = cards.id and user_id = $tagged)` in `collectionWhere`, so pagination and "Voir N cartes" stay correct. Web filter state gets `taggedUserId` (URL `tagged`), persisted by `use-persisted-collection-filters.ts`, active token "Sur la photo : Léa" (or "moi"), a chip row "Sur la photo" in the Filtres sheet with "Moi" first then members A→Z, inside the scrolling area above the pinned footer. | Reuses the persisted filters and pinned footer from main. |
| D14 | `card_tags` gains `created_at timestamptz not null default now()` and `tagged_by_id text null → user on delete set null`; the migration sets existing rows' `created_at` to `'2000-01-01'` so nobody gets a dot at deploy. | Needed for the "new tag" dot and the self-tag removal rules. |
| D15 | Self-tag: `POST /leagues/:leagueId/cards/:cardId/tags/me` (member owns an active copy, card active, not already tagged, max 30 tags per card), `DELETE /leagues/:leagueId/cards/:cardId/tags/:userId` (allowed for: the tagged user themself, the card author, league admins). Both `cardAction` rate limit. The artifact does not place the "Je suis dessus" button precisely; it goes in the owned card's "⋯" more-actions sheet, labelled "Je suis sur la photo", with an "Identifié(e) · Retirer" state. | Minimal moderation: author/admin can always undo. |
| D16 | Dot on Profil "Photos où tu apparais": the tagged list endpoint returns `taggedAt` per card; the client stores the last-seen tag date per user + league in localStorage (set when the screen opens) and shows the dot when a newer `taggedAt` exists. | No server state for a cosmetic dot; matches "pas de push, un point". |
| D17 | Emblem endpoints: `GET /leagues/:leagueId/members/:userId/emblems` (catalogue with progress + earned dates for that member — progress is public, nothing secret), `GET /leagues/:leagueId/emblems/unseen` (viewer), `POST /leagues/:leagueId/emblems/seen` `{ emblemIds }`, `PUT /leagues/:leagueId/emblems/featured` `{ emblemIds ≤ 3, earned only }`. Showcase: `PUT /leagues/:leagueId/showcase` `{ cardIds ≤ 6 }`, `DELETE /leagues/:leagueId/showcase`. New rate limits `emblemsSeen` (30/min), `profileEdit` (30/min). | Small, explicit routes; mutations rate-limited like existing ones. |
| D18 | Unlock banner (grid A): slides from the top, "stamp" sound with `level` = the emblem's tier rank (existing `stamp` voice and its existing sound category), stays 4 s, tap → own member page Emblèmes tab; marks seen on show. Suspended while the booster stage, the onboarding stories or the whats-new booster are open (reuse `isOnboardingBlocking` pattern in `l.$leagueId.tsx`); queued until they close. One unseen → named banner; several → "Tu as débloqué N emblèmes". | "Célèbre sans interrompre une ouverture de booster". |
| D19 | Entry points to a member page: avatar/name rows in the Réactions sheet (wave 1), avatars in Révélations récentes, the author line on the card vitrine, and the new Profil › Membres list (`/l/$leagueId/members`). The member chips in the Collection filter **stay filters** (a chip cannot both filter and navigate) — deviation from the artifact's entry list, flagged. Former members are never links. | Avoids a double-meaning tap. |
| D20 | Web routes: `/l/$leagueId/members` (list) and `/l/$leagueId/members/$userId` with search `tab: 'photos' | 'tagged' | 'emblems'` (default photos). Profil gets "Membres" and "Emblèmes x/15" rows (the latter opens own page on the emblems tab). | Deep-linkable tabs, banner target. |
| D21 | Tests: only `emblems.test.ts` (catalogue evaluation: thresholds hit/miss, Archiviste minimum, Doré progress, Muse) and one showcase auto-fill helper test if it is a pure function. ≤ 6 cases. | Few tests rule. |

## 4. Design

### 4.1 Shared (`packages/shared`)
- `domain/emblems.ts`: `EMBLEM_IDS`, `EMBLEM_CATALOGUE`, `EmblemStats`, `evaluateEmblems`, `featuredFallback(earned)`.
- `domain/showcase.ts`: `SHOWCASE_SLOTS = 6`, `resolveShowcase(saved, ownedRanked)` (drop stale, auto-fill, unique).
- `schemas/emblems.ts`, `schemas/member-profile.ts`, `schemas/showcase.ts`, extend `schemas/cards.ts` (`taggedUserId`, `revealOwn`, `unpulledCardSummarySchema` in the `collectionCardSchema` union), extend tagged card schema with `taggedAt`.

### 4.2 Data (`packages/db`)
- `schema/emblems.ts` (`member_emblems`), `schema/showcase.ts` (`member_showcase`), `card_tags` columns (D14). Migration `0016_members_emblems.sql` via `db:generate` + hand-added `UPDATE card_tags SET created_at = '2000-01-01'`.
- `queries/emblems.ts`: `loadEmblemStats`, `awardEarnedEmblems`.

### 4.3 API (`apps/api`)
- `features/emblems/` (routes, service, repository): list for member, unseen, seen, featured.
- `features/members/` profile route + `member-profile.service.ts` / repository (stats, showcase resolve, featured).
- `features/showcase/` (routes, service, repository): save, reset.
- `features/cards/`: `taggedUserId` + `revealOwn` in `collectionWhere` / views (`toUnpulledSummary`), self-tag routes in a small `features/tags/` slice.
- Award calls (D5) in `boosters.service.ts`, `reactions.service.ts`, `copies/stacks.service.ts` (promotion), `copies/copies.service.ts` (foil upgrade).

### 4.4 Worker (`apps/worker`)
- `jobs/emblems-evaluate.job.ts` + `features/emblems/emblems-evaluate.service.ts`; enqueue after card publish and rarity recompute; boot enqueue per league (singleton key `emblems-boot:<leagueId>`).

### 4.5 Web (`apps/web`)
- `features/members/`: member page (header, 4 tiles, showcase 3×2, tabs), members list, showcase editor sheet, data hooks.
- `features/emblems/`: grid, emblem sheet, unlock banner + gate, hooks.
- `features/cards/`: "Sur la photo" chip row, token, persisted filter key, `unpulled` card face ("Pas encore tirée"), self-tag action.
- Profil rows, entry links (reactions sheet, recent reveals, vitrine author).

## 5. Out of scope
Push for tags or emblems, emblem tiers, secret emblems, trades, sets, quiz, showcase reordering by drag (selection order = slot order).

## 6. Risks
- **Rebase on wave 1**: touches `reactions-sheet.tsx`, `profile.index.tsx`, `collection-cursor`/`cards.ts` schemas, `cards.repository.ts`; migration number must follow 0015.
- **Boot backfill cost**: one stats query per member per league at each worker boot — fine at 5-30 members; becomes a nightly-only job if leagues grow.
- **Award inside transactions** adds one query to booster opening and reactions; must not fail the action — awards use `on conflict do nothing` and run after the main writes; any error rolls back the action, so the query is kept simple and covered by the E2E.
- **`unpulled` card kind** extends the `CollectionCard` union: every `switch` on `kind` in the web must handle it (typecheck enforces).
- **Self-tagging abuse** in a friends league is low; author/admin removal is the safety valve.
