# Storix — Wave 4 missions and league goal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax.
>
> **Commits:** one commit per task, conventional message, only on branch `feat/wave4-missions-goal`.

**Goal:** I-14 missions (A "Le carnet sous le booster") and I-17 league goal (A "La jauge commune").

**Spec:** `docs/superpowers/specs/2026-11-10-storix-wave4-missions-goal.md` — decisions U1…U10, D1…D23. Read it fully first.

**Design source:** https://claude.ai/artifact/QtHu76St5wvtNGo21a5t5M, local `/private/tmp/claude-501/-Users-tristanhourtoulle--paradev-sessions-victorious-hamster-f823c5be/ff466f9b-8cfa-4957-a0b3-c205181e635e/scratchpad/wave4/wave4.html`. Web tasks reproduce proposals A **pixel-perfect at app scale** (same layout, proportions, colours, radii, copy and data; a uniform ~1.2× vs the 320 px mock is expected). Create missing primitives rather than substituting; flag unavoidable deviations.

**Design system:** https://claude.ai/artifact/PnujcYudoKxB6yCvdwWchz (`project/README.md`). Mythic = purple + rainbow ring `.t-M`.

**Branch / worktree:** `feat/wave4-missions-goal`, `/Users/tristanhourtoulle/.paradev/sessions/storix-wave4`, from `origin/main` ff2a7da. Migration 0018.

## Global constraints
- Node 24, no new dependency, TypeScript strict, no `any`, immutable data, Zod at boundaries.
- No comments except basic JSDoc on exported functions. English code, French UI copy.
- Layering: routes = HTTP only, services = use cases, repositories = DB only, pure logic in `packages/shared`.
- Few tests: only those listed. No CI.
- Do not boot the stack, touch Docker, run db:migrate/push or edit `.env` in implementation tasks (verification task excepted).
- Verify each task: `pnpm typecheck`, `pnpm lint`, `pnpm --filter @storix/shared exec vitest run`.

## Parallelism map
```
T1 ──► T2 ──► T3 (boosters) ─┐
              ├► T4 (missions api) ──► T5 (goal api)   [T4/T5 serial: app.ts/deps.ts]
              └► T6 (worker)  (parallel with T3/T4/T5 after T2)
T7 (feed rows) after T1, parallel with T3-T6
T8 (web missions) after T4 ; T9 (web goal + widget) after T3+T5 — T8/T9 serial (both edit l.$leagueId.index.tsx)
T10 verification + release notes
```

---

## Task 1 — Shared domain and contracts (D1, D4, D5, D10, D14, D15, D19)
**Files:** create `packages/shared/src/domain/missions.ts`, `missions.test.ts`, `league-goal.ts`, `league-goal.test.ts`; modify `domain/booster-stock.ts` (+ `booster-stock.test.ts` one case), `domain/league-feed.ts`, `domain/index.ts`; create `schemas/missions.ts`, `schemas/league-goal.ts`; modify `schemas/wallet.ts`, `schemas/index.ts`, shared audit action list.
- [ ] `MISSION_RESET_HOUR = 5`, `missionDayKey(now)`, `missionWeekKey(now)`, `periodBounds(period, key)` in Europe/Paris (reuse the Intl Paris formatter style from `whats-new.ts`).
- [ ] Catalogues `DAILY_MISSIONS`, `WEEKLY_MISSIONS` with `{ id, label, target, reward: { dust } | { boosters } }` exactly as D5 (French labels from the artifact).
- [ ] `selectDailyMissions(seedHex, yesterdayIds)` (slot 0 booster mission), `selectWeeklyMissions(seedHex)`, `rerollDailyMission({ seedHex, rerollIndex, slot, currentIds, yesterdayIds })`.
- [ ] `GOAL_TYPES`, `GOAL_RATES`, `goalTypeForWeek(weekKey)`, `goalTarget(type, activeMembers, factor)`, `bonusTarget(target)`, `nextGoalFactor({ factor, status, reachedWithinDays })`.
- [ ] `BoosterSource`, `pickBoosterSource({ premiumGifts, availableStock, bonus })`.
- [ ] Event types `missions_week_completed` (filter feats, groupable), `league_goal_reached`, `league_goal_bonus`, `league_goal_missed` (filter all) + payload types.
- [ ] Schemas: missions response (day + week rows with progress, claimable, claimed, reroll available, resetAt), claim/reroll responses, goal response (type, target, bonus, progress, status, own, contributorsCount, contributors ≤ 4, endsAt, banner), contributors list; wallet `booster.bonus`, `booster.premiumGifts`.
- [ ] Tests (5 max): daily selection deterministic + slot 0 booster + excludes yesterday; weekly picks 4 distinct; Paris 05:00 day/week keys around DST and 04:59; goalTarget for 5/12/30 members matches the artifact table; nextGoalFactor clamps; pickBoosterSource order.
**Acceptance:** shared typecheck/tests green.

## Task 2 — DB schema + migration 0018 (D10, D13, D18, D20, D23)
**Files:** modify `packages/db/src/schema/wallets.ts`, `boosters.ts`, `league-reads.ts`, `schema/index.ts`; create `schema/missions.ts`, `schema/member-page-visits.ts`, `schema/league-goals.ts`; generated `packages/db/drizzle/0018_*.sql` + meta.
- [ ] Columns/tables per spec §4.2 with checks (`>= 0`, enums via check), uniques, FKs to `league_members` cascade, indexes D23 (only those missing).
- [ ] `pnpm --filter @storix/db db:generate` → 0018; review SQL (additive only).
**Acceptance:** db typecheck green; SQL additive; journal count +1 (worker gate follows).

## Task 3 — API boosters: reserve + premium gift (D10-D12)
**Files:** `apps/api/src/features/boosters/boosters.service.ts`, `boosters.repository.ts`, `apps/api/src/features/wallets/wallets.repository.ts`, `wallet-state.ts`.
- [ ] Read `bonus_boosters`, `premium_gifts`; `pickBoosterSource`; consume the right column inside the existing locked transaction; `isPremium = source === 'premium_gift' || isPremiumBooster(boostersOpened)`; store `source`; empty-stock error only when all three are 0.
- [ ] Wallet state exposes `booster.bonus`, `booster.premiumGifts`.
**Acceptance:** typecheck; replay path untouched; existing booster tests green.

## Task 4 — API missions + member visit (D2-D9, D20, D21)
**Files:** create `apps/api/src/features/missions/{missions.routes.ts,missions.service.ts,missions.repository.ts,mission-progress.repository.ts}`; modify `apps/api/src/app.ts`, `deps.ts`, `apps/api/src/features/members/members.routes.ts` (+ service/repo for visit), audit action registration.
- [ ] `ensurePeriodMissions` (lazy materialise, ON CONFLICT DO NOTHING), `deriveProgress(missions)` one query per distinct source (D6), `claimMission` (D7) incl. `missions_week_completed` event on 4th weekly claim, `rerollMission` (D8).
- [ ] `settlePeriod(leagueId?, period, key)` exported for the worker (auto-claim completed rows) — put shared derive/claim SQL in `packages/db/src/queries/missions.ts` so api and worker reuse it.
- [ ] Routes with `requireLeagueRole('member')`, Zod params, rate limits D21; visit route no-op on self.
**Acceptance:** typecheck/lint; claim twice → 409; not complete → 409.

## Task 5 — API league goal (D13-D18)
**Files:** create `apps/api/src/features/league-goal/{league-goal.routes.ts,league-goal.service.ts,league-goal.repository.ts}`; `packages/db/src/queries/league-goal.ts` (ensure week goal, derive progress, transitions + grants, shared with worker); modify `app.ts`, `deps.ts`.
- [ ] GET goal: ensure row (target from active members + factor of previous week), derive progress, run transitions D17 idempotently, return payload; contributors endpoint; banner-seen POST.
**Acceptance:** typecheck/lint; repeated GET after reach grants once.

## Task 6 — Worker jobs (D9, D17)
**Files:** create `apps/worker/src/jobs/{missions-settle.job.ts,league-goals-tick.job.ts,league-goals-close.job.ts}`, `apps/worker/src/features/missions/*`, `features/league-goal/*`; modify `apps/worker/src/main.ts`, `packages/shared/src/schemas/jobs.ts`.
- [ ] Schedules: settle `5 5 * * *` Europe/Paris; tick `*/10 * * * *`; close `5 5 * * 1` Europe/Paris (close previous week: missed event + next factor, ensure next goal). Per-league try/catch with logger warn; info logs with counts.
**Acceptance:** typecheck/lint; job handlers idempotent.

## Task 7 — Feed rows for new events (D19)
**Files:** `apps/api/src/features/league-feed/*` (render payloads), `apps/web/src/features/league-feed/*` row copy + icons.
- [ ] "Léa a bouclé ses missions de la semaine" (grouped ×N), "Objectif atteint · 48 photos · +2 boosters pour tous", "Palier bonus · +1 premium", "Objectif manqué de 4 photos". Copy and icons from the artifact feed line.
**Acceptance:** typecheck/lint/build.

## Task 8 — Web missions (I-14 A)
**Files:** create `apps/web/src/features/missions/{missions.api.ts,missions.queries.ts,use-missions.ts,fly-to-dust.ts}`, `components/{missions-card.tsx,mission-row.tsx,missions-sheet.tsx}`, `apps/web/src/styles/missions.css`; modify `routes/_authed/l.$leagueId.index.tsx`, `features/game/components/dust-balance.tsx` (target ref for the flight), member page (call visit once).
- [ ] Card under the booster widget: header "Missions du jour 2 / 3 · reset 5 h", 3 rows (✓ claimed green struck, "+N" violet pulse when claimable, grey reward otherwise), week line "Semaine · 2 missions sur 4 · Voir"; collapsed line when the 3 are claimed.
- [ ] Claim: optimistic, coin sound, diamond flies to the dust counter (reduced motion: no flight), invalidate wallet + missions + feed.
- [ ] Sheet Jour / Semaine (BottomSheet), progress "15 / 15", reward chips, reset countdown, reroll button (1/day) on unclaimed incomplete daily rows.
**Acceptance:** typecheck/lint/build; matches artifact A.

## Task 9 — Web league goal + booster widget (I-17 A, D12, D18)
**Files:** create `apps/web/src/features/league-goal/{league-goal.api.ts,league-goal.queries.ts,use-league-goal.ts}`, `components/{goal-card.tsx,goal-helpers-sheet.tsx,goal-banner.tsx}`, `styles/league-goal.css`; modify `l.$leagueId.index.tsx` (order D22), `l.$leagueId.tsx` (banner in modal queue), `features/game/components/booster-widget.tsx`, `booster-pack.tsx`.
- [ ] Goal card: title, "reste 3 j 14 h", verb + "36 / 48 photos", gauge with target mark and bonus mark, labels "+2 boosters à 48 · premium à 72", own chip "toi · 5" + avatars + "9 amis ont posté" (verb per type), tap → "Qui a aidé" sheet.
- [ ] Banner: cyan "Objectif atteint · 48 photos cette semaine · +2 boosters pour tout le monde", summary sound, dismiss → seen.
- [ ] Widget: count includes bonus + gifts; premium pack when next source is a gift.
**Acceptance:** typecheck/lint/build; matches artifact A.

## Task 10 — Verification + release notes (orchestrator / E2E agents)
- [ ] Context-free review; apply 0018 locally; Chrome E2E (claim, double claim, reroll, settle by running the job handler, goal reach → grants once to all, bonus tier → premium gift opens premium, banner, feed lines, widget counts) at 390/320; side-by-side pixel check vs artifact A; close Chrome pages.
- [ ] Release note entry (next id per date), cards "Missions du jour" and "Objectif de la ligue".
