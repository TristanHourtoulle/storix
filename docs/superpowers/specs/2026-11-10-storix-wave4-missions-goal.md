# Storix — Wave 4: missions and league goal — Design spec

Date: 2026-11-10 · Branch `feat/wave4-missions-goal` · Base `origin/main` ff2a7da (waves 1-3 shipped).

## 1. Goal

Give members two reasons to come back every day without push notifications (I-04 rejected):

- **I-14 Missions** — proposal **A "Le carnet sous le booster"**: 3 daily missions and a weekly summary in a card under the booster widget; tap "+N" to claim (coin sound, a paillette flies to the dust counter); "Voir" opens a Jour / Semaine bottom sheet.
- **I-17 League goal** — proposal **A "La jauge commune"**: one shared weekly goal with a progress bar, a target (+2 boosters for every member) and a bonus tier at 150 % (+1 premium booster); own share plus "N amis ont posté", no ranking; cyan banner and a feed line when reached.

Design source (pixel-perfect at app scale, uniform ~1.2× vs the 320 px mock): https://claude.ai/artifact/QtHu76St5wvtNGo21a5t5M, local `scratchpad/wave4/wave4.html`.

## 2. Frozen user decisions (2026-11-10)

| # | Decision |
|---|---|
| U1 | I-14 = A, I-17 = A. |
| U2 | Manual claim, with automatic credit of unclaimed completed rewards at reset. |
| U3 | 3 daily missions (one "booster" mission always present), 4 weekly; no repeat of yesterday's set when possible. |
| U4 | 1 free reroll of a daily mission per day. |
| U5 | Feed: only "a bouclé ses missions de la semaine", grouped; never daily. |
| U6 | Goal reward: +2 boosters for all at target, +1 premium at 150 %, even for non-contributors. |
| U7 | Goal type rotates weekly, photos every other week. |
| U8 | Contributions: own share + "N amis ont contribué"; per-member detail only in a "Qui a aidé" sheet, no ranking, never names who did nothing. |
| U9 | Keep the "visit a member page" mission (light trace, no history). |
| U10 | Cards only ever come from boosters; rewards are paillettes, bonus boosters or a premium booster. |

## 3. Decisions made by the planner

| ID | Decision | Why |
|---|---|---|
| D1 | **Resets at 05:00 Europe/Paris**: day = [05:00, next 05:00); week = Monday 05:00 → next Monday 05:00. Pure helpers `missionDayKey(now)` (`YYYY-MM-DD` of the day start) and `missionWeekKey(now)` (`YYYY-MM-DD` of the Monday start) in shared. | Artifact rule; 5 h does not cut an evening. |
| D2 | **Progress is derived, not incremented.** A mission's progress = count of the member's qualifying actions with `created_at >= mission.started_at` (and `< period end`), read from existing tables. No write path in existing services changes. | No coupling to 8 services; "only actions after the mission appeared" and "a reaction removed then re-added counts once" fall out naturally (the deleted row no longer exists). |
| D3 | **Mission rows are materialised lazily** on the first read of a period (`INSERT … ON CONFLICT DO NOTHING`) so the selection, reward and `started_at` are frozen; the worker settle job also materialises nothing (it only settles existing rows). | Selection stays stable within the period and supports reroll. |
| D4 | **Deterministic selection**: seed = first 32 hex chars of `sha256("missions:" + leagueId + ":" + userId + ":" + periodKey)` → `createSeededRandom`. Daily: slot 0 is a booster mission (`open_boosters` or `open_many_boosters`), slots 1-2 drawn without replacement from the rest, excluding yesterday's ids when ≥ 2 remain. Weekly: 4 of the 8 weekly missions. | Reproducible, testable, no table needed for the RNG. |
| D5 | **Catalogue** (exact artifact values). Daily: `open_boosters` 2 → 15 ✦; `open_many_boosters` 4 → 25 ✦; `react` 3 → 10 ✦; `react_authors` 3 distinct authors → 15 ✦; `post_photo` 1 → 20 ✦; `send_bravo` 1 → 10 ✦; `discover` 1 → 20 ✦; `visit_member` 1 → 5 ✦; `tag_self` 1 → 10 ✦; `edit_showcase` 1 → 10 ✦. Weekly: `open_boosters` 15 → 60 ✦; `post_photos` 4 → 80 ✦; `react` 15 → 50 ✦; `promote` 1 → 100 ✦; `discover` 3 → 80 ✦; `send_bravos` 5 → 40 ✦; `foil` 1 → 80 ✦; `daily_streak` 5 days → +1 bonus booster. | Artifact tables. |
| D6 | **Sources**: boosters → `booster_openings` (opener, league); reactions → `reactions` joined to `cards.league_id` (author ≠ self is already enforced); distinct authors → `count(distinct cards.author_id)`; photos → `cards` authored by the member, `status='active'`, `created_at` in window; Bravo → `event_bravos.created_at` joined to `league_events.league_id`; discover → `booster_pulls.is_discovery` via openings; visit → new `member_page_visits`; tag self → `card_tags` where `user_id = tagged_by_id = member` and `created_at` in window; showcase → `member_showcase.updated_at`/`created_at` in window; promote / foil → `league_events` `card_promoted` / `card_foiled` with `actor_id = member`; daily streak → number of distinct day keys in the week where all 3 daily missions are completed. | Every source exists today except visits. |
| D7 | **Claim** = one transaction: lock wallet (`lockWallet`), re-derive progress, require `progress >= target`, `UPDATE member_missions SET claimed_at = now WHERE id = $1 AND claimed_at IS NULL RETURNING`, credit dust or `bonus_boosters`, write audit `mission_claimed`. Second claim → 409 `MISSION_ALREADY_CLAIMED`; not complete → 409 `MISSION_NOT_COMPLETE`. | Idempotent, race-safe. |
| D8 | **Reroll**: only an unclaimed, not-yet-complete daily slot; at most 1 per member per day (`rerolled_at` column, count check under the wallet lock); replacement drawn with the same seeded RNG advanced by the reroll index, excluding today's and yesterday's ids; new row gets `started_at = now`. Slot 0 (booster) can be rerolled only into the other booster mission. | U4, keeps "booster always present". |
| D9 | **Settle at reset**: worker job `missions.settle` scheduled `5 5 * * *` Europe/Paris. For the previous day (and previous week on Mondays) it credits every completed-but-unclaimed row (same claim path, `claimed_at` + `auto_claimed = true`). Idempotent. | U2: nobody loses what they earned. |
| D10 | **Bonus reserve**: wallet gains `bonus_boosters int ≥ 0` and `premium_gifts int ≥ 0`. Pure `pickBoosterSource(state)` in `booster-stock.ts`: order `premium_gift` → `timer` (regular stock) → `bonus`. Regular stock first so the refill timer keeps running; bonus never touches the timer or the 6 cap. `booster_openings.source` (`timer` \| `bonus` \| `premium_gift`, default `timer`). | Artifact guardrail; a reward should not be wasted by a full stock. |
| D11 | **Premium gift**: opening from `premium_gift` passes `isPremium: true` to `drawBooster` (existing v4 path). It increments `boosters_opened` like any opening (artifact: bonus boosters count for the premium counter and pity) but does not consume a timer slot. `DROP_TABLE_VERSION` stays 4: draw logic is unchanged, only its input. A natural 20th that coincides with a gift stays premium too. | No counter hack; replays stay deterministic (is_premium already stored). |
| D12 | **Wallet state** adds `booster.bonus` and `booster.premiumGifts`; the widget's "N boosters prêts" = stock + bonus + premiumGifts; the pack shows premium when the next source is `premium_gift` or the 20th. | One number for the user, as in the artifact. |
| D13 | **League goal row** `league_goals` (league, week_key unique, type, target, bonus_target, factor, status `active`\|`reached`\|`bonus`\|`missed`, reached_at, bonus_reached_at, closed_at). Created lazily on first read of the week and by the worker at Monday 05:05. | Mirrors missions. |
| D14 | **Goal type rotation**: by ISO week number of `week_key`: even weeks `photos`; odd weeks cycle `boosters`, `reactions`, `discoveries`, `bravos` (index `(isoWeek - 1) / 2 mod 4`). | U7. |
| D15 | **Target**: per-active-member rate (photos 4, boosters 12, reactions 15, discoveries 3, bravos 3) × active members, × factor, rounded up, min 1; bonus = ceil(1.5 × target). Active member = member with a booster opening in the last 14 days (closest existing proxy for "opened the app"), min 1. Factor starts 1.0; at week close: reached in < 4 days → ×1.1, missed → ×0.9, clamped [0.7, 1.5]. Pure `goalTarget(type, activeMembers, factor)` and `nextGoalFactor(previous)` in shared. | Artifact table + smoothing. |
| D16 | **Goal progress** = derived league-wide count since `week start` (same sources as D6, all members). Contributions = per-member counts (members with ≥ 1 only). API returns `own`, `contributorsCount`, up to 4 contributor avatars (most recent contribution first, never a rank), and a separate `GET …/goal/contributors` for the "Qui a aidé" sheet sorted by display name. | U8. |
| D17 | **Goal transitions are idempotent conditional updates** inside one transaction: `UPDATE … SET status='reached' WHERE id=$1 AND status='active' RETURNING` → grant +2 `bonus_boosters` to every current member (locked in member order), emit `league_goal_reached`; same for `reached`→`bonus` (+1 `premium_gifts`, event `league_goal_bonus`). Checked on every goal GET and by worker job `league-goals.tick` every 10 min; week close (`missed` + event `league_goal_missed` with the gap, next factor) at Monday 05:05. | Reward exactly once, even with nobody online. |
| D18 | **Banner**: `league_reads.goal_banner_seen_week text null`; Home shows the cyan "Objectif atteint" banner when the current (or just-closed) goal is `reached`/`bonus` and the week differs; dismiss → POST seen. Sound `summary`. Queued behind other modals like the Mythic banner (wave 3 queue). | Artifact. |
| D19 | **Feed**: new event types `missions_week_completed` (actor; emitted in the claim tx when the 4th weekly mission is claimed, dedupe `mwc:{league}:{user}:{week}`; groupable in 3 h like small events; filter `feats`), `league_goal_reached`, `league_goal_bonus`, `league_goal_missed` (no actor; filter `all` only; rendered with the goal icon). | U5. |
| D20 | **Member page visit trace**: `member_page_visits (league_id, visitor_id, visited_id, day_key)` PK on all four; `POST /leagues/:id/members/:userId/visit` (no-op on self, rate limited) called once per mount of another member's page. | U9, light, no history beyond day. |
| D21 | **Rate limits**: missions GET 60/min, claim 30/min, reroll 10/min, visit 30/min, goal GET 60/min, banner seen 20/min — same helper as existing routes. | Consistency. |
| D22 | **Home order**: booster widget → "Objectif de la ligue" card → "Missions du jour" card → "Dans la ligue" (artifact). Missions card collapses to one line "Missions du jour bouclées · reviens demain" once the 3 are claimed. | Artifact. |
| D23 | **Indexes** for derivation: `reactions (user_id, created_at)`, `event_bravos (user_id, created_at)`, `booster_openings (league_id, opened_at)` if missing, `card_tags (tagged_by_id, created_at)`. | Counts stay cheap. |

## 4. Design

### 4.1 Shared (`packages/shared`)
- `domain/missions.ts`: catalogue (D5), `missionDayKey`, `missionWeekKey`, `periodBounds`, `selectDailyMissions(seedHex, yesterdayIds)`, `selectWeeklyMissions(seedHex)`, `rerollMission(...)`, `missionSeedInput(...)`, `isMissionComplete`, `rewardOf`.
- `domain/league-goal.ts`: types, `goalTypeForWeek`, `goalTarget`, `bonusTarget`, `nextGoalFactor`, `GOAL_RATES`.
- `domain/booster-stock.ts`: `BoosterSource`, `pickBoosterSource`.
- `domain/league-feed.ts`: 4 new event types + filters.
- `schemas/missions.ts`, `schemas/league-goal.ts`, wallet additions.

### 4.2 Data (`packages/db`, migration 0018)
`member_wallets.bonus_boosters`, `member_wallets.premium_gifts` (int, default 0, ≥ 0); `booster_openings.source` (text, default 'timer', check); `member_missions` (id, league_id, user_id, period 'day'|'week', period_key, slot, mission_id, target, reward_dust, reward_boosters, started_at, claimed_at, auto_claimed, rerolled_at, created_at; unique (league, user, period, period_key, slot)); `member_page_visits`; `league_goals`; `league_reads.goal_banner_seen_week`; indexes D23. FKs to `league_members` with cascade.

### 4.3 API
- `boosters`: source selection + premium gift + `source` stored; wallet state fields.
- `missions` feature: `GET /leagues/:id/missions` (materialise + derive), `POST …/missions/:missionId/claim`, `POST …/missions/:missionId/reroll`.
- `members`: `POST …/members/:userId/visit`.
- `league-goal` feature: `GET /leagues/:id/goal`, `GET …/goal/contributors`, `POST …/goal/banner-seen`.
- Audit actions `mission_claimed`, `goal_reward_granted`.

### 4.4 Worker
`missions-settle` daily job; `league-goals-tick` every 10 min; `league-goals-close` Monday 05:05 Paris (close previous, open next).

### 4.5 Web (pixel-perfect vs A, app scale)
- `features/missions`: `missions-card.tsx` (3 rows + week line, "+N" pulse button, collapsed state), `missions-sheet.tsx` (Jour / Semaine tabs, countdown, reroll), `use-missions.ts`, `fly-to-dust.ts` (paillette diamond animation to `DustBalance`, reduced-motion fallback), coin sound.
- `features/league-goal`: `goal-card.tsx` (gauge with target and bonus marks, own share, avatars + "N amis ont …"), `goal-helpers-sheet.tsx` ("Qui a aidé"), `goal-banner.tsx` (cyan banner, summary sound, modal queue).
- `game/booster-widget.tsx`: count includes bonus + gifts; premium pack when next source is a gift.
- Feed rows for the 4 new event types.

## 5. Out of scope
Push notifications, mission cosmetics, per-league mission settings, admin overrides of the goal.

## 6. Risks
- Derived progress runs ~7 small counts per missions GET; indexes D23 keep it cheap at 5-30 members.
- Goal grant locks every member wallet of a league in one transaction (≤ 30 rows) — fine, ordered locking avoids deadlocks.
- Week-boundary races (claim at 04:59:59 vs settle at 05:05) are safe: claim is a conditional update on the row, settle skips claimed rows.
- "Active member" proxy (booster opening in 14 days) may differ from "opened the app"; acceptable, documented.
- Bonus boosters inflate opening volume by ~3-6 % (artifact economy table); premium gifts add ~1 guaranteed legendary per reached bonus week.
