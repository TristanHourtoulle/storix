# Storix — Wave 3 feed, celebrations, journal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax.
>
> **Commits:** one commit per task, conventional message, only on branch `feat/wave3-feed-celebrations`.

**Goal:** I-05 league feed (A "Le fil sous le booster"), I-08 upgrade celebration (A "Le sacre"), I-09 admin journal (A "Le registre").

**Spec:** `docs/superpowers/specs/2026-11-10-storix-wave3-feed-celebrations.md` — decisions D1…D20. Read it fully first.

**Design source:** https://claude.ai/artifact/ULor8Za51zWVyQgkso4eqd, local `/private/tmp/claude-501/-Users-tristanhourtoulle--paradev-sessions-victorious-hamster-f823c5be/ff466f9b-8cfa-4957-a0b3-c205181e635e/scratchpad/wave3/vague-3.html`. Web tasks diff markup/CSS against the picked proposals and reproduce them exactly; create missing primitives rather than substituting; flag unavoidable deviations.

**Design system:** https://claude.ai/artifact/PnujcYudoKxB6yCvdwWchz (`project/README.md`). Mythic = purple + rainbow ring `.t-M`.

**Branch / worktree:** `feat/wave3-feed-celebrations`, worktree `/Users/tristanhourtoulle/.paradev/sessions/storix-wave3`. **Before T1: rebase onto `origin/main` once wave 2 (`feat/wave2-members-emblems`) has merged.** Migrations start at 0017.

## Global constraints
- Node 24. No new dependency. TypeScript strict, no `any`, immutable data, Zod at boundaries.
- No comments except basic JSDoc on exported functions. English code, French UI copy.
- Layering: routes = HTTP only, services = use cases, repositories = DB only, pure logic in `packages/shared`.
- Privacy: never return a title or image URL for a card the viewer doesn't own (reuse `withViewerCopies` + `toCollectionCard`).
- Tests: only those in D20. No CI.
- Don't boot the stack, Docker, `db:migrate`/`db:push`, seed or edit `.env` unless the task says so.
- Verification for every task: `pnpm typecheck`, `pnpm lint`, `pnpm --filter @storix/shared exec vitest run` when shared changed.

## Parallelism map
- **T1** (shared) first.
- **T2** (db) after T1.
- After T2: **T3** (event emitters api), **T4** (worker emitters), **T5** (feed API), **T6** (journal API) touch disjoint files → parallel, except `app.ts`/`deps.ts` registration in T5 and T6: run T5 and T6 in one agent or serially.
- After T5: **T7** (web feed) and **T8** (web celebration) in parallel (different folders; T8 only touches `features/cards/components/promotion-*`/`foil-*` + new overlay, T7 touches Home + new feature folder + league layout for the banner gate).
- After T6: **T9** (web journal), parallel with T7/T8.
- **T10** verification last.

## Task 1 — Shared domain + contracts (D2, D6, D7, D14, D15, D20)
**Files:** create `packages/shared/src/domain/league-feed.ts` (+ `league-feed.test.ts`), `packages/shared/src/domain/audit.ts` (+ `audit-groups.test.ts`), `packages/shared/src/schemas/league-feed.ts`, `packages/shared/src/schemas/audit.ts`; modify `domain/index.ts`, `schemas/index.ts`.
- [ ] `LEAGUE_EVENT_TYPES`, `FEED_FILTERS` (`all`, `pulls`, `photos`, `feats` → type lists), `FEED_WINDOW_DAYS = 30`, `FEED_GROUP_WINDOW_MS = 3 * 3600_000`, `FEED_HOME_ROWS = 8`.
- [ ] `groupFeed(events, { viewerId, lastSeenAt, windowMs })` per D6, returns rows newest first with `isNew`.
- [ ] `AUDIT_CATEGORIES`, `auditCategory(action)`, `DEFAULT_AUDIT_CATEGORIES` (all except economy), `groupAuditEntries` per D15. Move/re-export `AUDIT_ACTIONS` so shared owns the list (db keeps importing it).
- [ ] Schemas per spec §4.1 (feed query/row/page/highlights, audit query/entry/page).
- [ ] Tests: 4 cases in `league-feed.test.ts`, 2 in `audit-groups.test.ts`.
**Acceptance:** shared typecheck + tests pass; no runtime dependency on db.

## Task 2 — DB tables, migration 0017, event insert query (D1, D4, D9, D10, D17)
**Files:** create `packages/db/src/schema/{league-events,league-reads,event-bravos}.ts`, `packages/db/src/queries/league-events.ts`; modify `schema/index.ts`, `queries/index.ts` (or the package entry), `packages/db/src/queries/emblems.ts` (`awardEarnedEmblems` emits `emblem_unlocked` for the ids it inserted); generate `packages/db/drizzle/0017_*.sql` via `pnpm --filter @storix/db db:generate`, then append the backfill SQL (D17) by hand, including `league_reads` rows with `feed_seen_at = now()` for every current member.
- [ ] `insertLeagueEvents(db, events)` with `onConflictDoNothing({ target: dedupeKey })`, no-op on empty array.
- [ ] Index `(league_id, visible_at desc, id desc)` on `league_events`; `dedupe_key` unique.
**Acceptance:** migration file reviewed (additive only), journal count bumps (worker migration gate follows the journal), typecheck passes. Do NOT run the migration.

## Task 3 — API emitters (D4, D5)
**Files:** modify `apps/api/src/features/boosters/boosters.service.ts` (one `booster_opened` with `{ openingId, isPremium, bestTier }`, one `card_pulled` per Epic+/discovery draw, same tx, skipped on `presentStored` replays), `apps/api/src/features/copies/stacks.service.ts` (`card_promoted` `{ copyId, fromTier, toTier }`), `apps/api/src/features/copies/copies.service.ts` (`card_foiled`), `apps/api/src/features/invitations/invitations.service.ts` (`member_joined`). Use `insertLeagueEvents` from `@storix/db`.
**Acceptance:** typecheck/lint; read-only reasoning that each insert sits inside the existing `runInTransaction`/`withContext` tx.

## Task 4 — Worker emitters (D5)
**Files:** modify `apps/worker/src/features/media/card-publish.service.ts` (`card_published`, `visible_at = now + league newCardDelayMinutes`, inside the publish tx), `apps/worker/src/features/rarity/rarity-recompute.service.ts` (+ its repository if needed: `card_tier_reached` for cards whose tier rose into legendary or mythic, dedupe on `cardId:tier:computedAt`).
**Acceptance:** typecheck/lint.

## Task 5 — Feed API (D8, D9, D10, D13, D18)
**Files:** create `apps/api/src/features/league-feed/{league-feed.routes,league-feed.service,league-feed.repository}.ts`; register in `apps/api/src/app.ts` / `deps.ts`.
- [ ] `GET /leagues/:leagueId/feed` (member): raw page (visible_at ≤ now, ≥ now − 30 d, type filter), batched bravo counts + viewer bravos + viewer copies for referenced cards + actor names (former members flagged), `groupFeed`, `{ rows, nextCursor, lastSeenAt }`.
- [ ] `POST /leagues/:leagueId/feed/seen`, `PUT /leagues/:leagueId/feed/events/:eventId/bravo` (same league, type `card_promoted`, not own event → 409 otherwise), `GET /leagues/:leagueId/feed/highlights`, `POST /leagues/:leagueId/feed/highlights/seen`.
**Acceptance:** typecheck/lint; locked cards come back as locked summaries (no title/url); bad cursor → 400.

## Task 6 — Journal API (D14, D15, D16, D18)
**Files:** modify `apps/api/src/features/audit/audit.repository.ts`; create `apps/api/src/features/audit/{audit.routes,audit.service}.ts`; register (serialize with T5 on `app.ts`/`deps.ts`).
- [ ] `GET /leagues/:leagueId/audit` (`requireLeagueRole('admin')`): league rows + account rows of current members (D14), category/actor/from filters, cursor (created_at, id), 50/page, actor/target resolved with `isFormer`, `groupAuditEntries`, `hasUnseenAlerts`.
- [ ] `POST /leagues/:leagueId/audit/seen` → `league_reads.journal_seen_at`.
**Acceptance:** typecheck/lint; member role → 403.

## Task 7 — Web feed (I-05) + Mythic banner gate (D13, D19)
**Files:** create `apps/web/src/features/league-feed/{league-feed.api,league-feed.queries,use-league-feed,use-bravo,use-feed-seen}.ts`, `components/{feed-section,feed-row,feed-filters,mythic-banner-gate}.tsx`, `apps/web/src/styles/league-feed.css`, route `apps/web/src/routes/_authed/l.$leagueId.activity.tsx`; modify `l.$leagueId.index.tsx` (replace `RecentReveals`), `l.$leagueId.tsx` (mount the gate, suspended like the other gates), remove `recent-reveals.tsx` + its query/API/route if unused elsewhere (grep first), invalidate the feed after booster opening, promotion, foil.
**Acceptance:** matches proposal A markup (chips, separator, big rows, ×N rows, Bravo pill), typecheck/lint/build.

## Task 8 — Web celebration (I-08) (D11, D12)
**Files:** create `apps/web/src/features/cards/components/promotion-celebration.tsx`, `apps/web/src/styles/promotion-celebration.css`; modify `promotion-sheet.tsx` and `foil-upgrade-sheet.tsx` success paths (and the vitrine owner if the overlay must mount above the sheet), share entry with `flex` preselected.
**Acceptance:** phases + sounds per D11, tap skips, reduced motion shows final state, Mythic uses `.t-M` ring; typecheck/lint/build.

## Task 9 — Web journal (I-09) (D14–D16)
**Files:** create `apps/web/src/features/audit/{audit.api,audit.queries,audit-sentence}.ts`, `components/{journal-panel,journal-row,journal-filter-sheet}.tsx`, `apps/web/src/styles/journal.css`; modify `apps/web/src/routes/_authed/l.$leagueId.admin.tsx` (`journal` tab, red dot, visible to owner/admins).
**Acceptance:** sentences for every `AUDIT_ACTIONS` entry with a generic fallback, day groups, category colours, expandable detail, failed codes red, filter sheet with pinned footer, infinite scroll 50; typecheck/lint/build.

## Task 10 — Verification (orchestrator + check agents)
- Context-free review of `git diff origin/main...HEAD` (privacy, tx placement, idempotence, pagination, layering).
- Apply 0017 on the LOCAL DB only; seed events if needed; Chrome E2E at 390 px: Home feed (since last visit, grouping, filters, locked card blurred, tap targets, Tout voir pagination), Bravo once, celebration (promote Rare→Épique, foil short, Mythic ring, skip, share Flex), Mythic banner for another member, admin Journal (member 403, owner view, chips, filter sheet, Économie toggle, failed codes red + dot cleared, former member "(parti)").
- Close every browser page opened during E2E.
