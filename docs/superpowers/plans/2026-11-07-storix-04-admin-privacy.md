# Storix Plan 4 — Admin & Privacy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Commits:** every task ends with a commit step, but `git add` / `git commit` run ONLY after the user's explicit go-ahead at execution time. Without it, stop at the step and report. Exception: Task 16 merges and pushes to `main` (authorized by Tristan for the final MVP deploy).

**Goal:** League owners and admins tune the game (booster cadence, upload quota, rarity weights with a live distribution preview, new-card delay) and moderate cards (hide, delete, pin, bounds, Mythic event, validate date); every card disappearance (admin deletion, tagged-member withdrawal, member removal or departure, account deletion) removes the card and its copies everywhere, compensates owners in dust, really deletes the files, and purges client caches; members can leave, owners can transfer ownership, users can delete their account; the MVP ships with a full README.

**Architecture:** One API helper, `CardRemoval`, removes a set of cards inside the caller's transaction (economy lock → compensation → tombstones → cards → media → uploads) and returns the object keys, which are deleted after commit by a `storage.delete` pg-boss job; a weekly `storage.gc` job removes anything left behind. Every booster/craft/recycle transaction takes a shared per-league advisory lock and every removal takes it exclusively, so a removal never races a pull. Settings live in the Plan 3 `leagues.settings` JSON column (Zod-validated), saving enqueues the Plan 3 rarity recompute; the preview runs the same pure `computeLeagueRarity` on the league's current inputs. Clients pull tombstones (`card_removals`) since a cursor and purge Cache Storage entries by media prefix.

**Tech Stack:** Plans 1-3 stack. New SDK call only: `ListObjectsV2Command` (`@aws-sdk/client-s3`, already installed). No new dependency.

**Spec:** `docs/superpowers/specs/2026-11-07-storix-design.md` (4.7 admin, 5.1 precedence and recompute, 5.6 privacy, 6.3 auth and leagues, 6.5 code quality). Roadmap: `docs/superpowers/plans/2026-11-07-storix-roadmap.md`. Conventions and contracts this plan builds on: Plans 1-3 in the same folder (Plan 3 = `2026-11-07-storix-03-game.md`: `card_copies`, `member_wallets`, rarity columns `tier_source`/`pinned_tier`/`min_tier`/`max_tier`/`computed_tier`, `reactions`, `leagues.settings`, `card_rarity_history`, `rarity.recompute` job, `card-views.ts`, `collectionCardSchema`). Visual language: direction A mockup `Main.dc.html` (no admin screen in it: derive from `.seg`, `.chip`, `.pill`, `.meta-cell`, `.info-row`, `.bar`/`.bar-fill`, `.card.locked`, `.btn`).

**User decisions (binding):**
1. Collection = owned copies; locked cards blurred with no image URL; the author does not auto-own; no trades.
2. Account deletion is an explicit service; delete order cards → media → uploads (`uploads.user_id` RESTRICT, `media.upload_id` and `cards.media_id` NO ACTION stay as they are).
3. Owners of a removed card are compensated in dust: `dustValue(tier_at_mint, variant)` per copy (×2 foil).
4. Files are really deleted from the bucket, through jobs.
5. Clients purge removed cards (Cache Storage media + API entries, query cache) from a synced list of removed ids.

**Prerequisite:** Plan 3 is complete, merged into `feat/foundation` and `main`, deployed. Plan 4 runs on branch `feat/admin-privacy` created from `feat/foundation`. Before Task 1, read the real Plan 3 code for every name this plan consumes (`packages/shared/src/domain/{cards,dust,rarity-engine,rarity-tiers}.ts`, `packages/shared/src/schemas/{league-settings,cards,boosters,jobs,errors}.ts`, `apps/api/src/features/{wallets,boosters,copies,cards}/*`, `apps/worker/src/features/rarity/*`, `apps/worker/src/jobs/rarity-queue.ts`); if a name differs, keep the behavior, use the real name, and say so in the task report.

## Global Constraints

- Node 24 (`source ~/.nvm/nvm.sh && nvm use 24` first in each shell). TypeScript stays 6.0.3 repo-wide. Latest versions rule for anything new (nothing new is planned); keep every pinned version.
- Context7 is unavailable: before coding against `ListObjectsV2Command` pagination (`ContinuationToken`, `IsTruncated`), pg-boss v12 (`createQueue` on an existing queue, `schedule` with `tz`, `send` options), Better Auth 1.7 internals (`ctx.internalAdapter.findAccounts`, `ctx.password.verify({ hash, password })`, `getSession` returning `session.createdAt`), Drizzle 0.45 (`sql` advisory locks, `inArray`, `delete … returning`), read the official docs or the installed `node_modules` typings. If a pin is wrong, keep the behavior, adapt, and report it.
- TypeScript strict, `noUncheckedIndexedAccess`, no `any`, immutable data, Zod at every boundary (HTTP in/out, job payloads, settings JSON, web responses).
- NO comments in code except basic JSDoc on public functions. Code, logs, commits, README in English (`type(scope): description`); UI copy in French ("paillettes", "Masquée", "Mythique", "Réglages").
- Layering exactly as `eslint.config.js`: routes HTTP only; services = use cases (no SQL, no Fastify, no pg-boss, only type imports from `@storix/db`); repositories = Drizzle only; worker `*.job.ts` = parse payload + call one service; `packages/shared/src/domain` pure (imports only `./*`); web components presentational, data in hooks, NO game rule client-side.
- Tests: Vitest ONLY in `packages/shared` for pure rules (`pnpm test`): compensation, moderation rules, eligibility delay, rarity preview, orphan classification, media prefixes, settings schema validation. No other suite, no CI. Every other task ends with a manual verification (command + expected output, or a browser check).
- Files 200-400 lines max. No `console.*` (pino in api/worker; `apps/web/src/lib/logger.ts` only).
- Ports: web 5180, api 3020, postgres 5440, prod preview 3021, MinIO 9100/9101. Dev servers only through Portly (`storix/api`, `storix/web`, `storix/worker`): `portly status --json` first, reuse healthy servers, `portly restart <name> --json` after changes, `portly logs <name>` to read output.
- Invariants kept: `/media` route (HMAC windows, `public, immutable`, never `Set-Cookie`); `/api/*` `Cache-Control: no-store`; locked and hidden cards never carry a `/media/` URL or a title outside the admin and "photos où tu apparais" views; booster opening idempotency; dust never negative.
- Values: Mythic cap `3` per league (active + hidden cards with `pinned_tier = 'mythic'`); default new-card delay `720` minutes (12 h); default upload quota `10` per member per rolling 24 h; default cadence `240` min / max stock `6` / join gift `2`; dust values from Plan 3 `DUST_VALUES`, foil ×2; fresh-session window for passkey re-auth `5` minutes; tombstone retention `35` days; removal sync initial window `30` days and overlap `10` minutes; GC grace `24` h for `img/` and `48` h for `incoming/`; GC cron `0 4 * * 0` Europe/Paris.

## Review Focus

1. A card is removed while a member is opening a booster, crafting or recycling that same card: no copy of the removed card survives, each owner is compensated exactly once, the opening still succeeds or is refused cleanly, and Postgres never reports a deadlock (Task 5 parallel curl check with the economy lock).
2. A booster opening is replayed (reload of `/booster?request=…`) after one of its cards was deleted or hidden: the API answers a clear `BOOSTER_CONTENT_REMOVED` instead of a 500 or a leaked image, and the web shows a French message with a link to the collection (Task 7 curl + Task 13 browser check).
3. The bucket is down or slow during a deletion, or a user is deleted while one of their uploads is still being processed: the database commit is not blocked, the delete job retries, the worker's late media insert fails without crashing, and the weekly GC removes the stragglers (Task 4 MinIO-stopped check, Task 10 check).
4. A phone that was offline for weeks, or a user who was removed from a league, comes back: removed cards disappear from the collection and from Cache Storage on the first sync, and a removed member loses every cached image of that league (Task 15 DevTools check).
5. Settings at the edges: all three weights at 0, max stock lowered below a member's current stock, delay 0, quota lowered below today's usage, a malformed JSON already in the column: either a 400 with a field error or a graceful effect (stock kept above max, quota shows 0 remaining), never a 500 (Task 2 schema tests, Task 6 curl checks).

---

## File Structure

```
packages/shared/src/domain/
  cards.ts (modified: delay parameter)  compensation.ts  moderation.ts  rarity-preview.ts
  storage-gc.ts  media-urls.ts (modified: prefixes)  index.ts (modified)
  (+ compensation, moderation, rarity-preview, storage-gc .test.ts; cards.test.ts new; media-urls.test.ts extended)
packages/shared/src/schemas/
  league-settings.ts (extended) + league-settings.test.ts  admin-cards.ts  removals.ts  account.ts
  cards.ts (hidden kind, canWithdraw, tagged cards)  boosters.ts (unchanged)  members.ts (extended)
  errors.ts  jobs.ts  index.ts
packages/db/src/schema/  removals.ts (new)  audit-log.ts  index.ts (modified)
packages/db/src/queries/rarity-inputs.ts (moved from the worker)  packages/db/src/index.ts
packages/db/drizzle/0004_<generated>.sql
packages/storage/src/object-storage.ts (list)
apps/worker/src/
  main.ts  jobs/{storage-delete.job,storage-gc.job,rarity-queue}.ts
  features/storage/{storage-delete.service,storage-gc.service,storage-gc.repository}.ts
  features/rarity/rarity.repository.ts (re-uses the moved query)
apps/api/src/
  deps.ts app.ts jobs/job-queue.ts http/rate-limit.ts auth/auth.gateway.ts
  features/wallets/wallets.repository.ts (economy lock)
  features/card-removal/{card-removal.service,card-removal.repository}.ts
  features/removals/{removals.routes,removals.service,removals.repository}.ts
  features/league-settings/{league-settings.routes,league-settings.service,league-settings.repository}.ts
  features/moderation/{moderation.routes,moderation.service,moderation.repository,admin-card-view}.ts
  features/withdrawals/{withdrawals.routes,withdrawals.service,withdrawals.repository}.ts
  features/members/{members.routes,members.service,members.repository}.ts (modified)
  features/account/{account.routes,account.service,account.repository}.ts
  features/cards/{cards.repository,card-views,cards.service}.ts  features/boosters/{boosters.repository,boosters.service}.ts
  features/uploads/uploads.service.ts  features/copies/copies.service.ts
apps/web/src/
  features/league-settings/  league-settings.api.ts league-settings.queries.ts use-league-settings.ts use-rarity-preview.ts
                             components/{settings-form,weight-slider,distribution-preview,number-setting}.tsx
  features/moderation/  moderation.api.ts moderation.queries.ts use-admin-cards.ts use-card-moderation.ts
                        components/{admin-card-list,admin-card-sheet,tier-pin-picker,tier-bounds-picker,delete-card-dialog}.tsx
  features/withdrawals/  withdrawals.api.ts use-tagged-cards.ts use-withdraw-card.ts components/{tagged-card-list,withdraw-card-dialog}.tsx
  features/cards/components/{hidden-card-face,hidden-card-detail}.tsx  collection-card-view.tsx card-detail.tsx locked-card-detail.tsx (modified)
  features/members/  use-transfer-ownership.ts use-leave-league.ts components/{member-row,member-list,transfer-ownership-dialog,leave-league-section}.tsx
  features/account/  account.api.ts use-account-deletion.ts components/delete-account-section.tsx
  features/privacy/  removals.api.ts use-removed-cards-sync.ts purge-cache.ts components/removal-notice.tsx
  features/boosters/components/booster-stage.tsx (removed-content state)
  features/errors/error-messages.ts  lib/storage.ts
  routes/_authed/l.$leagueId.admin.tsx (tabs)  l.$leagueId.profile.tsx  l.$leagueId.tagged.tsx (new)  l.$leagueId.tsx (sync + purge)
README.md  docs/superpowers/plans/2026-11-07-storix-roadmap.md
```

---

### Task 1: Domain — compensation, moderation rules, eligibility delay, media prefixes

**Files:**
- Create: `packages/shared/src/domain/{compensation,moderation}.ts`
- Modify: `packages/shared/src/domain/{cards,media-urls,index}.ts`
- Test: `packages/shared/src/domain/{compensation,moderation,cards}.test.ts`, extend `media-urls.test.ts`

**Interfaces (exported from `@storix/shared/domain` and `@storix/shared`):**
- Consumes: `CardTier`, `ComputedTier`, `tierRank`, `dustValue`, `CopyVariant` (Plan 3), `LeagueRole`.
- Produces:
  - `cards.ts`: replace `BOOSTER_ELIGIBILITY_DELAY_MS` with `DEFAULT_NEW_CARD_DELAY_MINUTES = 720`; `boosterEligibleBefore(now: Date, delayMinutes: number): Date`; `isBoosterEligible(createdAt: Date, now: Date, delayMinutes: number): boolean`; `boosterEligibleAt(createdAt: Date, delayMinutes: number): Date`. Update every Plan 3 caller (they pass the league setting from Task 6; until then pass `DEFAULT_NEW_CARD_DELAY_MINUTES`).
  - `compensation.ts`: `interface RemovedCopy { ownerId: string; cardId: string; tierAtMint: CardTier; variant: CopyVariant }`; `interface OwnerCompensation { ownerId: string; dust: number; perCard: readonly { cardId: string; dust: number }[] }`; `compensateRemovedCopies(copies: readonly RemovedCopy[]): OwnerCompensation[]` — sums `dustValue(tierAtMint, variant)` per owner and per card, sorted by `ownerId` ascending (the lock order used by the API), `perCard` sorted by `cardId`.
  - `moderation.ts`:
    - `MYTHIC_CAP = 3`
    - `type PinBlock = 'mythic_cap'`; `canPinTier(input: { tier: CardTier | null; isAlreadyMythic: boolean; mythicCount: number }): { allowed: boolean; reason: PinBlock | null }` — only `tier === 'mythic' && !isAlreadyMythic && mythicCount >= MYTHIC_CAP` is refused.
    - `areTierBoundsValid(min: ComputedTier | null, max: ComputedTier | null): boolean` — false only when both set and `tierRank(min) > tierRank(max)`.
    - `canWithdrawCard(input: { isTagged: boolean; isAuthor: boolean }): boolean` (`isTagged || isAuthor`).
    - `canTransferOwnership(input: { actorRole: LeagueRole; targetRole: LeagueRole; isSelf: boolean }): boolean` — owner → admin only, never self.
    - `canLeaveLeague(role: LeagueRole): boolean` (`role !== 'owner'`).
    - `interface OwnedLeague { leagueId: string; name: string; memberCount: number }`; `accountDeletionPlan(owned: readonly OwnedLeague[]): { blocking: OwnedLeague[]; solo: OwnedLeague[] }` — `memberCount > 1` blocks, `memberCount === 1` is deleted with the account.
    - `REMOVAL_REASONS = ['admin_deleted','withdrawn','member_removed','member_left','account_deleted','league_deleted'] as const`; `type RemovalReason`.
  - `media-urls.ts`: `mediaPrefix(input: { leagueId: string; sourceSha256: string }): string` → `img/{leagueId}/{sha}/`; `leagueMediaPrefix(leagueId: string): string` → `img/{leagueId}/`; `mediaCachePathPrefix(prefix: string): string` → `/media/{prefix}` (what the SW cache keys start with).

- [ ] **Step 1: Write the failing tests.**

```ts
// compensation.test.ts
it('compensates each owner from tier at mint, foil doubled, sorted by owner', () => {
  const result = compensateRemovedCopies([
    { ownerId: 'u2', cardId: 'c1', tierAtMint: 'rare', variant: 'normal' },
    { ownerId: 'u1', cardId: 'c1', tierAtMint: 'common', variant: 'foil' },
    { ownerId: 'u2', cardId: 'c2', tierAtMint: 'legendary', variant: 'foil' },
    { ownerId: 'u2', cardId: 'c1', tierAtMint: 'epic', variant: 'foil' },
  ])
  expect(result).toEqual([
    { ownerId: 'u1', dust: 10, perCard: [{ cardId: 'c1', dust: 10 }] },
    { ownerId: 'u2', dust: 1025, perCard: [{ cardId: 'c1', dust: 225 }, { cardId: 'c2', dust: 800 }] },
  ])
})
it('returns nothing for no copies', () => expect(compensateRemovedCopies([])).toEqual([]))

// moderation.test.ts
it('caps mythic pins at 3', () => {
  expect(canPinTier({ tier: 'mythic', isAlreadyMythic: false, mythicCount: 2 })).toEqual({ allowed: true, reason: null })
  expect(canPinTier({ tier: 'mythic', isAlreadyMythic: false, mythicCount: 3 })).toEqual({ allowed: false, reason: 'mythic_cap' })
  expect(canPinTier({ tier: 'mythic', isAlreadyMythic: true, mythicCount: 3 }).allowed).toBe(true)
  expect(canPinTier({ tier: 'epic', isAlreadyMythic: false, mythicCount: 3 }).allowed).toBe(true)
  expect(canPinTier({ tier: null, isAlreadyMythic: true, mythicCount: 3 }).allowed).toBe(true)
})
it('validates bounds', () => {
  expect(areTierBoundsValid('rare', 'epic')).toBe(true)
  expect(areTierBoundsValid('rare', 'rare')).toBe(true)
  expect(areTierBoundsValid('epic', 'rare')).toBe(false)
  expect(areTierBoundsValid(null, 'common')).toBe(true)
})
it('decides withdrawal, transfer and leave', () => {
  expect(canWithdrawCard({ isTagged: true, isAuthor: false })).toBe(true)
  expect(canWithdrawCard({ isTagged: false, isAuthor: false })).toBe(false)
  expect(canTransferOwnership({ actorRole: 'owner', targetRole: 'admin', isSelf: false })).toBe(true)
  expect(canTransferOwnership({ actorRole: 'owner', targetRole: 'member', isSelf: false })).toBe(false)
  expect(canTransferOwnership({ actorRole: 'admin', targetRole: 'admin', isSelf: false })).toBe(false)
  expect(canLeaveLeague('owner')).toBe(false)
  expect(canLeaveLeague('admin')).toBe(true)
})
it('splits owned leagues for account deletion', () => {
  const a = { leagueId: 'a', name: 'A', memberCount: 1 }, b = { leagueId: 'b', name: 'B', memberCount: 4 }
  expect(accountDeletionPlan([a, b])).toEqual({ blocking: [b], solo: [a] })
})

// cards.test.ts
const now = new Date('2026-11-07T12:00:00Z')
it('applies the league new-card delay', () => {
  expect(boosterEligibleBefore(now, 720)).toEqual(new Date('2026-11-07T00:00:00Z'))
  expect(isBoosterEligible(new Date('2026-11-07T00:00:00Z'), now, 720)).toBe(true)
  expect(isBoosterEligible(new Date('2026-11-07T00:00:01Z'), now, 720)).toBe(false)
  expect(isBoosterEligible(now, now, 0)).toBe(true)
  expect(boosterEligibleAt(now, 60)).toEqual(new Date('2026-11-07T13:00:00Z'))
})

// media-urls.test.ts (added)
it('builds media prefixes', () => {
  const leagueId = '0b6f7c1e-3a59-4c1e-9d7e-2f1a6c3b4d5e', sha = 'a'.repeat(64)
  expect(mediaPrefix({ leagueId, sourceSha256: sha })).toBe(`img/${leagueId}/${sha}/`)
  expect(mediaVariantKey({ leagueId, sourceSha256: sha, size: 256, format: 'avif' }).startsWith(mediaPrefix({ leagueId, sourceSha256: sha }))).toBe(true)
  expect(mediaCachePathPrefix(leagueMediaPrefix(leagueId))).toBe(`/media/img/${leagueId}/`)
})
```

- [ ] **Step 2: Run** `pnpm --filter @storix/shared test` → FAIL (missing exports).
- [ ] **Step 3: Implement** the modules, re-export, and update the Plan 3 callers of the eligibility helpers (`boosters.service.ts`, `card-views.ts`, any worker use) to pass `DEFAULT_NEW_CARD_DELAY_MINUTES`.
- [ ] **Step 4: Run** `pnpm test && pnpm lint && pnpm typecheck` → PASS.
- [ ] **Step 5: Commit** (after go-ahead): `feat(shared): add compensation, moderation rules and configurable new-card delay`

---

### Task 2: Domain + contracts — rarity preview, orphan classification, settings and admin schemas

**Files:**
- Create: `packages/shared/src/domain/{rarity-preview,storage-gc}.ts` (+ `.test.ts`), `packages/shared/src/schemas/{admin-cards,removals,account}.ts`, `packages/shared/src/schemas/league-settings.test.ts`
- Modify: `packages/shared/src/schemas/{league-settings,cards,members,errors,jobs,index}.ts`, `packages/shared/src/domain/index.ts`, `apps/web/src/features/errors/error-messages.ts`

**Interfaces:**
- Consumes: `computeLeagueRarity`, `RarityCardInput`, `RarityWeights`, `CARD_TIERS`, `MEDIA_OBJECT_KEY_PATTERN`, Task 1 exports.
- Produces:
  - `rarity-preview.ts`: `type TierDistribution = Readonly<Record<CardTier, number>>`; `tierDistribution(tiers: readonly CardTier[]): TierDistribution` (all six keys, zeros included); `previewRarity(input: { cards: readonly (RarityCardInput & { tier: CardTier })[]; weights: RarityWeights; now: Date }): { current: TierDistribution; preview: TierDistribution; changed: number }` — `current` from `cards[].tier`, `preview` from `computeLeagueRarity(...).tier`, `changed` = cards whose tier differs.
  - `storage-gc.ts`: `interface StoredObject { key: string; lastModified: Date }`; `classifyOrphans(input: { objects: readonly StoredObject[]; liveMediaPrefixes: ReadonlySet<string>; liveIncomingKeys: ReadonlySet<string>; now: Date }): string[]` — `img/` keys whose first three segments + `/` are not in `liveMediaPrefixes` and older than 24 h; `incoming/` keys not in `liveIncomingKeys` and older than 48 h; anything else (unknown prefix) is never deleted; result sorted. Constants `GC_IMG_GRACE_MS = 86_400_000`, `GC_INCOMING_GRACE_MS = 172_800_000`.
  - `league-settings.ts` (extends Plan 3): add `uploadQuotaPerDay: z.int().min(1).max(50).default(DEFAULT_UPLOAD_QUOTA_PER_DAY)` and `newCardDelayMinutes: z.int().min(0).max(10_080).default(DEFAULT_NEW_CARD_DELAY_MINUTES)`; `updateLeagueSettingsBodySchema` = the same object with every field required and no defaults (`rarityWeights` refine `sum > 0` with message path `['rarityWeights']`); `leagueSettingsViewSchema = { settings: leagueSettingsSchema, mythicCount: int ≥ 0, mythicCap: z.literal(3) }`; `rarityPreviewBodySchema = { rarityWeights }`; `rarityPreviewSchema = { current, preview: z.object(six tiers → int ≥ 0), changed: int ≥ 0, total: int ≥ 0 }`. `resolveLeagueSettings` keeps never throwing; an invalid stored field falls back to its default only (parse each top-level key separately).
  - `cards.ts`: `hiddenCardSummarySchema = z.strictObject({ kind: z.literal('hidden'), id, number, tier: cardTierSchema (owned display tier), thumbhash, dominantColor, width, height, copies: ownedCopiesSchema })` (no title, no image) added to `collectionCardSchema`; `hiddenCardDetailSchema = hiddenCardSummarySchema.extend({ createdAt, canWithdraw: z.boolean() })` added to `viewerCardDetailSchema`; `ownedCardDetailSchema` and `lockedCardDetailSchema` gain `canWithdraw: z.boolean()`; `taggedCardSchema = { id, number, title, tier, status: z.enum(['active','hidden']), author, thumbhash, dominantColor, width, height, image: imageSetSchema, canWithdraw: z.literal(true) }`.
  - `admin-cards.ts`: `adminCardsQuerySchema = { filter: z.enum(['all','active','hidden','provisional','mythic']).default('all'), cursor, limit: 1..100 default 60 }`; `adminCardSchema = { id, number, title, status, tier, computedTier: computedTierSchema.nullable(), tierSource: z.enum(['computed','bounded','pinned']), pinnedTier: cardTierSchema.nullable(), minTier, maxTier (computed tiers, nullable), author, capturedAt: iso.nullable(), isCaptureDateValidated, createdAt, boosterEligibleAt: iso, copiesInLeague: int ≥ 0, thumbhash, dominantColor, width, height, image: imageSetSchema }`; `adminCardPageSchema = { cards, nextCursor, mythicCount }`; bodies: `pinTierBodySchema = { tier: cardTierSchema.nullable() }`, `tierBoundsBodySchema = { min: computedTierSchema.nullable(), max: computedTierSchema.nullable() }`, `captureDateValidationBodySchema = { isValidated: z.boolean() }`, `cardVisibilityBodySchema = { status: z.enum(['active','hidden']) }`.
  - `removals.ts`: `removedCardsQuerySchema = { since: isoDateSchema.optional() }`; `removedCardSchema = { cardId: uuid, number: int > 0, mediaPrefix: z.string().regex(/^img\/[0-9a-f-]{36}\/[0-9a-f]{64}\/$/), removedAt: iso, compensation: int ≥ 0 }` (`compensation` = the viewer's dust for that card); `removedCardsSchema = { removed: z.array(removedCardSchema).max(500), cursor: iso }`.
  - `members.ts`: `memberSummarySchema` gains `authoredCardCount: int ≥ 0` and `canTransferOwnership: boolean`; `transferOwnershipBodySchema = { userId: idSchema }`.
  - `account.ts`: `accountDeletionPreviewSchema = { blocking: z.array({ leagueId, name }), solo: z.array({ leagueId, name }), authoredCardCount: int ≥ 0, requiresPassword: z.boolean() }` (`requiresPassword` false when the session is fresh); `deleteAccountBodySchema = { confirmUsername: z.string().min(1).max(64), password: z.string().min(1).max(128).optional() }`.
  - `errors.ts` adds before `INTERNAL_ERROR`: `MYTHIC_CAP_REACHED`, `INVALID_TIER_BOUNDS`, `CAPTURE_DATE_MISSING`, `WITHDRAW_NOT_ALLOWED`, `OWNERSHIP_TRANSFER_REQUIRED`, `LEAVE_NOT_ALLOWED`, `REAUTH_REQUIRED`, `CONFIRMATION_MISMATCH`, `BOOSTER_CONTENT_REMOVED`.
  - `jobs.ts` adds `STORAGE_DELETE_JOB = 'storage.delete'`, `STORAGE_GC_JOB = 'storage.gc'`, `storageDeletePayloadSchema = z.object({ keys: z.array(z.string().regex(/^(img\/|incoming\/)/)).min(1).max(1000) })`, and moves the rarity queue settings here: `RARITY_RECOMPUTE_QUEUE_OPTIONS` (the policy Plan 3 chose) and `RARITY_RECOMPUTE_SEND_OPTIONS = { retryLimit: 3, retryDelay: 30, retryBackoff: true }`, `STORAGE_DELETE_SEND_OPTIONS = { retryLimit: 8, retryDelay: 60, retryBackoff: true }`.
  - `error-messages.ts` French copy: `MYTHIC_CAP_REACHED: "La ligue a déjà 3 Mythiques."`, `INVALID_TIER_BOUNDS: "Le minimum doit être inférieur ou égal au maximum."`, `CAPTURE_DATE_MISSING: "Cette photo n'a pas de date de prise de vue."`, `WITHDRAW_NOT_ALLOWED: "Tu ne peux retirer que les photos où tu apparais."`, `OWNERSHIP_TRANSFER_REQUIRED: "Transfère d'abord la propriété de tes ligues."`, `LEAVE_NOT_ALLOWED: "Le propriétaire doit transférer la ligue avant de la quitter."`, `REAUTH_REQUIRED: "Confirme ton identité pour continuer."`, `CONFIRMATION_MISMATCH: "Le nom d'utilisateur ne correspond pas."`, `BOOSTER_CONTENT_REMOVED: "Une carte de ce booster a été retirée de la ligue."`.

- [ ] **Step 1: Write the failing tests.**

```ts
// rarity-preview.test.ts
const now = new Date('2026-11-07T00:00:00Z')
const input = (i: number, tier: CardTier): RarityCardInput & { tier: CardTier } => ({
  cardId: `c${i}`, authorId: i % 2 === 0 ? 'a' : 'b', capturedAt: new Date(now.getTime() - (i + 1) * 31_557_600_000),
  isCaptureDateValidated: true, reactors: 0, reactionSum: 0, previousComputedTier: null,
  pinnedTier: null, minTier: null, maxTier: null, tier,
})
it('counts every tier', () =>
  expect(tierDistribution(['rare', 'rare', 'mythic'])).toEqual({ common: 0, uncommon: 0, rare: 2, epic: 0, legendary: 0, mythic: 1 }))
it('previews 20 cards on photo age only as 9/5/3/2/1', () => {
  const cards = Array.from({ length: 20 }, (_, i) => input(i, 'common'))
  const result = previewRarity({ cards, weights: { uploaderScarcity: 0, photoAge: 1, reactions: 0 }, now })
  expect(result.preview).toEqual({ common: 9, uncommon: 5, rare: 3, epic: 2, legendary: 1, mythic: 0 })
  expect(result.current.common).toBe(20)
  expect(result.changed).toBe(11)
})
it('keeps pins in the preview', () => {
  const cards = [{ ...input(0, 'mythic'), pinnedTier: 'mythic' as const }]
  expect(previewRarity({ cards, weights: DEFAULT_RARITY_WEIGHTS, now }).preview.mythic).toBe(1)
})

// storage-gc.test.ts
const L = '0b6f7c1e-3a59-4c1e-9d7e-2f1a6c3b4d5e', sha = (c: string) => c.repeat(64)
const old = new Date('2026-11-01T00:00:00Z'), fresh = new Date('2026-11-06T23:00:00Z'), gcNow = new Date('2026-11-07T00:00:00Z')
it('deletes only old orphans under known prefixes', () => {
  const objects = [
    { key: `img/${L}/${sha('a')}/256.avif`, lastModified: old },
    { key: `img/${L}/${sha('b')}/256.avif`, lastModified: old },
    { key: `img/${L}/${sha('c')}/256.avif`, lastModified: fresh },
    { key: 'incoming/u1/x', lastModified: old },
    { key: 'incoming/u1/y', lastModified: old },
    { key: 'incoming/u1/z', lastModified: new Date('2026-11-05T12:00:00Z') },
    { key: 'other/file', lastModified: old },
  ]
  expect(classifyOrphans({
    objects, liveMediaPrefixes: new Set([`img/${L}/${sha('a')}/`]), liveIncomingKeys: new Set(['incoming/u1/y']), now: gcNow,
  })).toEqual([`img/${L}/${sha('b')}/256.avif`, 'incoming/u1/x'])
})

// league-settings.test.ts
const valid = {
  rarityWeights: { uploaderScarcity: 1, photoAge: 2, reactions: 0 },
  booster: { intervalMinutes: 1, maxStock: 6, joinGift: 2 }, uploadQuotaPerDay: 10, newCardDelayMinutes: 0,
}
it('accepts edge values', () => expect(updateLeagueSettingsBodySchema.parse(valid)).toEqual(valid))
it('rejects all-zero weights, bad cadence and quota', () => {
  expect(updateLeagueSettingsBodySchema.safeParse({ ...valid, rarityWeights: { uploaderScarcity: 0, photoAge: 0, reactions: 0 } }).success).toBe(false)
  expect(updateLeagueSettingsBodySchema.safeParse({ ...valid, booster: { ...valid.booster, intervalMinutes: 0 } }).success).toBe(false)
  expect(updateLeagueSettingsBodySchema.safeParse({ ...valid, uploadQuotaPerDay: 0 }).success).toBe(false)
  expect(updateLeagueSettingsBodySchema.safeParse({ ...valid, newCardDelayMinutes: 10_081 }).success).toBe(false)
})
it('resolves stored settings field by field', () => {
  expect(resolveLeagueSettings(null).newCardDelayMinutes).toBe(720)
  const partial = resolveLeagueSettings({ uploadQuotaPerDay: 3, booster: 'garbage' })
  expect(partial.uploadQuotaPerDay).toBe(3)
  expect(partial.booster).toEqual({ intervalMinutes: 240, maxStock: 6, joinGift: 2 })
})
```

- [ ] **Step 2: Run** `pnpm --filter @storix/shared test` → FAIL.
- [ ] **Step 3: Implement** the modules and schemas; add the French messages.
- [ ] **Step 4: Run** `pnpm test && pnpm lint && pnpm typecheck` → PASS (the API may fail typecheck only where `memberSummarySchema` and the card detail schemas gained fields: add `authoredCardCount: 0`, `canTransferOwnership: false`, `canWithdraw: false` placeholders now; Tasks 7-9 fill them).
- [ ] **Step 5: Commit** (after go-ahead): `feat(shared): add admin, removal and account contracts with rarity preview`

---

### Task 3: Database — tombstones, compensations, audit actions, shared rarity query, bucket listing

**Files:**
- Create: `packages/db/src/schema/removals.ts`, `packages/db/src/queries/rarity-inputs.ts`
- Modify: `packages/db/src/schema/{audit-log,index}.ts`, `packages/db/src/index.ts`, `apps/worker/src/features/rarity/rarity.repository.ts`, `packages/storage/src/object-storage.ts`
- Generate: `packages/db/drizzle/0004_*.sql` (`pnpm db:generate`)

**Interfaces:**
- Consumes: `REMOVAL_REASONS`, `cardTier`, Plan 3 `listRarityInputs` body.
- Produces:
  - `removals.ts`: enum `removal_reason` from `REMOVAL_REASONS`; `cardRemovals` = `cardId uuid pk` (no FK, the card is gone), `leagueId` (→ leagues cascade), `number int`, `mediaPrefix text`, `reason`, `actorId` (→ user set null, nullable), `removedAt timestamptz default now()`; index `card_removals_league_removed_idx (league_id, removed_at)`. `cardCompensations` = `cardId uuid`, `leagueId` (cascade), `userId` (→ user cascade), `dust int check > 0`, `createdAt`; pk `(card_id, user_id)`; index `(league_id, user_id)`.
  - `AUDIT_ACTIONS` += `'league.settings_updated'`, `'league.ownership_transferred'`, `'league.deleted'`, `'member.left'`, `'card.hidden'`, `'card.unhidden'`, `'card.deleted'`, `'card.withdrawn'`, `'card.tier_pinned'`, `'card.bounds_set'`, `'card.capture_date_validated'`, `'card.removed'`, `'account.deleted'`.
  - `queries/rarity-inputs.ts`: `listRarityInputs(db: DbExecutor, leagueId: string): Promise<(RarityCardInput & { tier: CardTier })[]>` — moved verbatim from the Plan 3 worker repository (which now re-exports it); exported from `@storix/db`.
  - `object-storage.ts`: `ObjectStorage.list(prefix: string): AsyncIterable<StoredObject>` — `ListObjectsV2Command` with `Prefix`, 1000 per page, follows `NextContinuationToken`; yields `{ key, lastModified }` (`StoredObject` from `@storix/shared/domain`).

- [ ] **Step 1: Implement** and run `pnpm db:generate`.
- [ ] **Step 2: Verify:** `pnpm db:migrate` applies 0004; `psql postgres://storix:storix@localhost:5440/storix -c '\d card_removals' -c '\d card_compensations'` shows the pk, index and check; a second `pnpm db:migrate` is a no-op; `portly restart storix/worker --json` → the rarity recompute still logs `cards` = active count (moved query works); `pnpm lint && pnpm typecheck` → PASS. A one-off `node --env-file=.env -e` is not allowed for `list`; it is exercised by Task 4.
- [ ] **Step 3: Commit** (after go-ahead): `feat(db): add card tombstones, compensations and bucket listing`

---

### Task 4: Worker — file deletion job and weekly orphan GC

**Files:**
- Create: `apps/worker/src/features/storage/{storage-delete.service,storage-gc.service,storage-gc.repository}.ts`, `apps/worker/src/jobs/{storage-delete.job,storage-gc.job}.ts`
- Modify: `apps/worker/src/main.ts`, `apps/worker/src/jobs/rarity-queue.ts` (use the shared `RARITY_RECOMPUTE_*` constants)

**Interfaces:**
- Consumes: `STORAGE_DELETE_JOB`, `STORAGE_GC_JOB`, `storageDeletePayloadSchema`, `classifyOrphans`, `mediaPrefix`, `ObjectStorage.list/delete`, `cardRemovals`, `media`, `uploads`.
- Produces:
  - `storage-delete.service.ts`: `createStorageDeleteService({ storage, logger })` → `{ deleteObjects(keys: readonly string[]): Promise<void> }` (throws on failure so pg-boss retries; logs `{ count }`).
  - `storage-gc.repository.ts`: `listLiveMediaPrefixes(db): Promise<Set<string>>` (`mediaPrefix` of every `media` row); `listLiveIncomingKeys(db): Promise<Set<string>>` (`object_key` of uploads in `pending`/`uploaded`/`processing`); `deleteTombstonesBefore(db, before: Date): Promise<number>`.
  - `storage-gc.service.ts`: `createStorageGcService({ db, storage, clock, logger })` → `{ collect(): Promise<{ scanned: number; deleted: number; tombstones: number }> }` — reads both live sets BEFORE listing, lists `img/` then `incoming/`, `classifyOrphans`, deletes in chunks, purges tombstones older than 35 days.
  - Jobs: `registerStorageDeleteJob(boss, service, logger)` (invalid payload → log + skip); `registerStorageGcJob(boss, service)` — `schedule(STORAGE_GC_JOB, '0 4 * * 0', null, { tz: 'Europe/Paris' })`.
  - `main.ts`: `createQueue` for both; register both; `boss.send(STORAGE_GC_JOB, null)` once at startup (like Plan 3's startup rarity sweep: cheap at this scale, and every deploy cleans up).

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify** (`portly restart storix/worker --json`, `portly logs storix/worker`):
  - Put an orphan into MinIO: `docker compose exec minio mc cp /etc/hostname local/storix-media/img/<leagueId>/<64 × f>/256.avif`, restart the worker → the startup GC logs `scanned` = object count and `deleted: 0` (fresh orphan, within the 24 h grace).
  - Temporarily set `GC_IMG_GRACE_MS` to `0` locally, restart → the orphan is deleted and every live card image still loads in the app; revert the constant.
  - Send `storage.delete` with `{ keys: ['img/<live league>/<sha of a test card>/256.avif'] }` → object gone (`mc ls`); with MinIO stopped (`docker compose stop minio`) the job fails and is retried (`select state, retry_count from pgboss.job where name = 'storage.delete'`); restart MinIO → it completes (Review Focus 3). Payload `{ keys: ['../etc'] }` → logged and skipped.
  - `pnpm lint && pnpm --filter @storix/worker typecheck` → PASS.
- [ ] **Step 3: Commit** (after go-ahead): `feat(worker): delete removed files and collect bucket orphans weekly`

---

### Task 5: API — economy lock, card removal core, job queue, removed-cards sync

**Files:**
- Create: `apps/api/src/features/card-removal/{card-removal.service,card-removal.repository}.ts`, `apps/api/src/features/removals/{removals.routes,removals.service,removals.repository}.ts`
- Modify: `apps/api/src/features/wallets/wallets.repository.ts`, `apps/api/src/jobs/job-queue.ts`, `apps/api/src/deps.ts`, `apps/api/src/app.ts`, `apps/api/src/http/rate-limit.ts`

**Interfaces:**
- Consumes: `compensateRemovedCopies`, `mediaPrefix`, `RemovalReason`, Plan 3 wallet repository (`ensureWallet`, `lockWallet`), tables `cardRemovals`, `cardCompensations`, `cardCopies`, `cards`, `media`, `uploads`, `memberWallets`, `insertAuditEntry`.
- Produces:
  - `wallets.repository.ts`: `lockLeagueEconomyShared(db, leagueId)` / `lockLeagueEconomyExclusive(db, leagueId)` — `pg_advisory_xact_lock_shared` / `pg_advisory_xact_lock` on `hashtext('economy:' || leagueId)`. `lockWallet` calls `lockLeagueEconomyShared` first, so every Plan 3 opening, recycle, craft and foil upgrade takes it without other changes.
  - `job-queue.ts`: `JobQueue` gains `enqueueRarityRecompute(payload: RarityRecomputePayload): Promise<void>` (`singletonKey: leagueId`, `RARITY_RECOMPUTE_SEND_OPTIONS`) and `enqueueStorageDelete(keys: readonly string[]): Promise<void>` (chunks of 1000, `STORAGE_DELETE_SEND_OPTIONS`); `startJobQueue` creates both queues (`RARITY_RECOMPUTE_QUEUE_OPTIONS` for rarity).
  - `card-removal.repository.ts`: `lockCards(db, cardIds): Promise<RemovableCardRow[]>` (`SELECT … FOR UPDATE` joined with media: `id, leagueId, number, authorId, mediaId, uploadId, leagueIdOfMedia, sourceSha256, variantKeys: string[]`); `listCopiesOfCards(db, cardIds): Promise<RemovedCopy[]>`; `creditDust(db, input: { leagueId; userId; dust }): Promise<void>` (`UPDATE member_wallets SET dust = dust + $3`; the wallet exists because a copy exists — Plan 3 `ensureWallet` before every copy insert); `insertTombstones(db, rows)`; `insertCompensations(db, rows)`; `deleteCards(db, ids)`; `deleteMedia(db, ids)`; `deleteUploadsForMedia(db, uploadIds)`; `findCardIdsByAuthor(db, { leagueId; authorId }): Promise<string[]>`; `listOpenUploadKeys(db, { leagueId?; userId }): Promise<{ id; objectKey }[]>` (`pending`/`uploaded`/`processing`/`rejected`/`failed`); `deleteUploads(db, ids)`.
  - `card-removal.service.ts`:
    ```ts
    export interface RemovalOutcome { removedCardIds: string[]; objectKeys: string[]; compensatedOwners: number; dust: number }
    export interface CardRemoval {
      /** Removes the cards inside the caller's transaction; the caller must hold the league economy lock. */
      removeInTx(tx: DbExecutor, input: { leagueId: string; cardIds: readonly string[]; reason: RemovalReason; actorId: string | null }): Promise<RemovalOutcome>
      /** Deletes the files and recomputes rarity after commit; failures are logged, never thrown. */
      afterCommit(leagueId: string, outcome: RemovalOutcome): Promise<void>
    }
    export function createCardRemoval(deps: { jobs: JobQueue; logger: ErrorLogger }): CardRemoval
    ```
    `removeInTx` order: `lockCards` (cards of another league are ignored) → `listCopiesOfCards` → `compensateRemovedCopies` → `creditDust` per owner in returned (sorted) order → `insertCompensations` (per owner per card) → `insertTombstones` (`mediaPrefix` from the media row) → `deleteCards` (cascades copies, tags, reactions, history; `booster_pulls.card_id` and `uploads.card_id` become null) → `deleteMedia` → `deleteUploadsForMedia` → one `card.removed` audit entry per card (`{ number, reason, compensatedOwners, dust }`). `objectKeys` = every variant key. Empty `cardIds` → no-op outcome. `afterCommit` → `enqueueStorageDelete(objectKeys)` + `enqueueRarityRecompute({ leagueId })`.
  - `removals.repository.ts`: `listRemovedSince(db, { leagueId; viewerId; since: Date; limit: 500 })` (tombstones left-joined with the viewer's compensation, ordered by `removed_at`).
  - `removals.service.ts`: `listRemovedCards(m, since: Date | undefined): Promise<RemovedCards>` — `since` absent → `now − 30 days`; returns `cursor = now − 10 minutes` (overlap for transactions committing late; purge is idempotent).
  - Route: `GET /api/leagues/:leagueId/removed-cards` (`member`, query `removedCardsQuerySchema`) → `RemovedCards`. `rateLimits.adminAction = { max: 60, timeWindow: '1 minute' }`, `rateLimits.accountDelete = { max: 5, timeWindow: '15 minutes' }`.

- [ ] **Step 1: Implement.** No route uses `removeInTx` yet; Task 7 wires the first caller.
- [ ] **Step 2: Verify:** `GET …/removed-cards` → `{"removed":[],"cursor":"…"}` with `no-store`; `pnpm lint && pnpm typecheck` → PASS; open a booster and recycle a copy (Plan 3 flows) → still work (the shared lock is re-entrant per transaction). Concurrency is verified in Task 7 once deletion exists.
- [ ] **Step 3: Commit** (after go-ahead): `feat(api): add card removal with compensation, tombstones and file jobs`

---

### Task 6: API — league settings read, write, rarity preview; settings-driven quota and delay

**Files:**
- Create: `apps/api/src/features/league-settings/{league-settings.routes,league-settings.service,league-settings.repository}.ts`
- Modify: `apps/api/src/features/uploads/uploads.service.ts`, `apps/api/src/features/boosters/boosters.service.ts`, `apps/api/src/features/cards/{cards.service,card-views}.ts`, `apps/api/src/features/copies/copies.service.ts`, `apps/api/src/features/leagues/leagues.repository.ts`, `deps.ts`, `app.ts`

**Interfaces:**
- Consumes: `resolveLeagueSettings`, `updateLeagueSettingsBodySchema`, `previewRarity`, `listRarityInputs` (`@storix/db`), `MYTHIC_CAP`, `JobQueue.enqueueRarityRecompute`, `findLeagueSettings` (Plan 3).
- Produces:
  - `league-settings.repository.ts`: `updateLeagueSettings(db, leagueId, settings: LeagueSettings): Promise<void>`; `countMythicPins(db, leagueId): Promise<number>` (status `active` or `hidden`, `pinned_tier = 'mythic'`); re-export `listRarityInputs`.
  - `league-settings.service.ts`: `interface LeagueSettingsService { getSettings(m): Promise<LeagueSettingsView>; updateSettings(m, body): Promise<LeagueSettingsView>; previewRarity(m, weights): Promise<RarityPreview> }` — update = transaction (write + `league.settings_updated` audit with `{ from, to }`), then `enqueueRarityRecompute`; preview = `listRarityInputs` + `previewRarity` with `total = cards.length`.
  - Routes (all `requireLeagueRole('admin')`, mutations `rateLimits.adminAction`): `GET /api/leagues/:leagueId/settings` → view; `PUT …/settings` (body `updateLeagueSettingsBodySchema`) → view; `POST …/settings/rarity-preview` (body `rarityPreviewBodySchema`) → `RarityPreview`.
  - Settings now read by: `uploads.service` (`uploadQuotaPerDay` in `getQuota` and `createUpload`), `boosters.service` (`newCardDelayMinutes` for `boosterEligibleBefore`), `card-views`/`cards.service` and `copies.service` (craft `provisional` check with the same delay).

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify** (admin cookies, `L=<league>`):
  - `GET …/settings` → defaults + `mythicCount`, `mythicCap: 3`; as a plain member → 403.
  - `PUT` the Task 2 `valid` body → 200; `select settings from leagues` stores it; `portly logs storix/worker` shows one recompute for `L`; one `league.settings_updated` audit row.
  - Review Focus 5: weights all 0 → 400 `VALIDATION_FAILED` on `rarityWeights`; `maxStock: 1` while a wallet holds 3 → `GET /wallet` still says 3, `nextAt: null`; quota 1 after 2 uploads today → `GET …/uploads/quota` → `remaining: 0` and a new upload → 429 `UPLOAD_QUOTA_EXCEEDED`; `update leagues set settings = '{"booster":7}'` → `GET …/settings` returns the default booster block, no 500.
  - `newCardDelayMinutes: 0` → a card uploaded a minute ago can be pulled and crafted; back to 720 → `BOOSTER_POOL_EMPTY` in a league whose cards are all fresh.
  - `POST …/rarity-preview` with `{ uploaderScarcity: 0, photoAge: 1, reactions: 0 }` → counts sum to `total`; `changed` is 0 when posting the stored weights right after a recompute.
- [ ] **Step 3: Commit** (after go-ahead): `feat(api): add league settings with rarity preview and recompute trigger`

---

### Task 7: API — admin card moderation and hidden-card visibility

**Files:**
- Create: `apps/api/src/features/moderation/{moderation.routes,moderation.service,moderation.repository,admin-card-view}.ts`
- Modify: `apps/api/src/features/cards/{cards.repository,card-views,cards.service}.ts`, `apps/api/src/features/boosters/{boosters.repository,boosters.service}.ts`, `deps.ts`, `app.ts`

**Interfaces:**
- Consumes: `CardRemoval` (Task 5), `lockLeagueEconomyExclusive`, `canPinTier`, `areTierBoundsValid`, `resolveEffectiveTier`, `PROVISIONAL_TIER`, `boosterEligibleAt`, `toImageSet`, Task 2 admin schemas, settings (Task 6).
- Produces:
  - `moderation.repository.ts`: `lockLeagueModeration(db, leagueId)` (`pg_advisory_xact_lock(hashtext('moderation:' || leagueId))`); `listAdminCards(db, { leagueId; filter; beforeNumber?; limit; eligibleBefore })` (all non-removed cards with media, author, copy count; `provisional` = `created_at > eligibleBefore`; `mythic` = pinned mythic); `findCardForModeration(db, { leagueId; cardId }): Promise<ModerationCardRow | null>` (`FOR UPDATE`); `updateCardModeration(db, cardId, patch: Partial<{ status; pinnedTier; minTier; maxTier; tier; tierSource }>)`; `setCaptureDateValidated(db, mediaId, value)`; `insertRarityHistory(db, row)` (Plan 3 table).
  - `admin-card-view.ts`: `toAdminCard(row, ctx: { signer; delayMinutes }): AdminCard` (image sizes `[256, 768]`, admin views always carry the image).
  - `moderation.service.ts` (`interface ModerationService`): `listCards(m, query): Promise<AdminCardPage>`; `setVisibility(m, cardId, status)`; `pinTier(m, cardId, tier | null)`; `setBounds(m, cardId, { min, max })`; `setCaptureDateValidated(m, cardId, isValidated)`; `deleteCard(m, cardId)`; each returns the updated `AdminCard` except `deleteCard` (void). Each = one transaction: `lockLeagueModeration` → `findCardForModeration` (404 when missing) → rule (`canPinTier` with `countMythicPins` → 409 `MYTHIC_CAP_REACHED`; `areTierBoundsValid` → 400 `INVALID_TIER_BOUNDS`; no `captured_at` → 409 `CAPTURE_DATE_MISSING`) → for pin/bounds, recompute the effective tier immediately with `resolveEffectiveTier({ computed: computedTier ?? PROVISIONAL_TIER, pinned, min, max })` and, if `tier` changed, update it and insert a history row with that `tierSource` → audit (`card.hidden`/`card.unhidden`/`card.tier_pinned`/`card.bounds_set`/`card.capture_date_validated` with before/after) → after commit `enqueueRarityRecompute`. `deleteCard`: `lockLeagueEconomyExclusive` → `removeInTx(reason 'admin_deleted', actorId)` + `card.deleted` audit → `afterCommit`.
  - Routes (all `admin`, mutations `rateLimits.adminAction`): `GET /api/leagues/:leagueId/admin/cards` → `AdminCardPage`; `PATCH …/admin/cards/:cardId/visibility` (`cardVisibilityBodySchema`); `PUT …/admin/cards/:cardId/tier-pin` (`pinTierBodySchema`); `PUT …/admin/cards/:cardId/tier-bounds`; `PUT …/admin/cards/:cardId/capture-date`; `DELETE …/admin/cards/:cardId` → 204.
  - Hidden visibility (Plan 3 code):
    - `listCollection` includes `status = 'hidden'` rows only when the viewer owns a copy; `toCollectionCard` returns `kind: 'hidden'` for them (built field by field, no title, no image); `total`/`ownedCount` keep counting active cards only.
    - `findCardForViewer` returns hidden cards; `toCardDetail` → hidden + owned → `hiddenCardDetail`; hidden + not owned → 404. Recycle, craft, foil and reactions on a hidden card → 404 (they already require `active`; check).
    - `listRecentReveals` filters `cards.status = 'active'`.
    - `boosters.service` replay: when `listOpeningPulls` returns a pull whose card is gone or not active → `AppError('BOOSTER_CONTENT_REMOVED', 410, …, { openingId })` (the wallet is unaffected).

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify** (admin `A`, member `M` who owns a copy of card `C`, member `N` who does not):
  - `GET …/admin/cards?filter=provisional` lists only cards younger than the delay, each with `boosterEligibleAt`; as `M` → 403.
  - Hide `C` → `M`'s `/cards` shows `C` as `kind: "hidden"` with no `title`/`/media/` (`grep -c`), `N`'s list does not contain `C`, `C` never appears in 20 new openings (`select count(*) from booster_pulls bp join booster_openings bo on bo.id = bp.opening_id where bp.card_id = 'C' and bo.opened_at > now() - interval '5 minutes'` = 0), no dust moved; unhide → back to normal.
  - Pin 3 cards Mythic → 4th → 409 `MYTHIC_CAP_REACHED`; re-pinning one of the three → 200; the card's `tier` is `mythic` immediately with `tier_source = 'pinned'` and one history row; unpin (`tier: null`) → tier back to its computed one after the recompute.
  - Bounds `{ min: 'epic', max: 'rare' }` → 400 `INVALID_TIER_BOUNDS`; `{ min: 'rare', max: null }` on a common → tier `rare`, `bounded`.
  - Validate the date of a card without `captured_at` → 409 `CAPTURE_DATE_MISSING`; with a date → `media.is_capture_date_validated = true`, recompute logged.
  - Delete `C` (owned normal by `M` at `tier_at_mint` rare, foil by `A` at common): `M` +25, `A` +10 dust; `card_copies`, `cards`, `media`, `uploads` rows for `C` gone; one `card_removals` and two `card_compensations` rows; within a minute the six variant objects are gone from MinIO (`docker compose exec minio mc ls --recursive local/storix-media/img/$L/<sha>/` → empty); `M`'s `GET /removed-cards` lists `C` with `compensation: 25`.
  - Review Focus 1: with `M` owning nothing of card `D`, run in parallel 10 booster openings by `M` (distinct `requestId`s, stock set to 10, delay 0, a 2-card league) and `DELETE …/admin/cards/D` → every request ends 200/409/410 cleanly, `grep -i deadlock` in `portly logs storix/api` is empty, no `card_copies` row for `D`, and `M`'s compensation for `D` equals the value of the copy they held at deletion time.
  - Review Focus 2: open a booster, hide one of its cards, reload the same `requestId` → 410 `BOOSTER_CONTENT_REMOVED`.
- [ ] **Step 3: Commit** (after go-ahead): `feat(api): add admin card moderation and hidden cards`

---

### Task 8: API — tagged-member withdrawal and "photos where you appear"

**Files:**
- Create: `apps/api/src/features/withdrawals/{withdrawals.routes,withdrawals.service,withdrawals.repository}.ts`
- Modify: `apps/api/src/features/cards/{cards.repository,card-views}.ts` (`canWithdraw`), `deps.ts`, `app.ts`

**Interfaces:**
- Consumes: `canWithdrawCard`, `CardRemoval`, `lockLeagueEconomyExclusive`, `taggedCardSchema`, `toImageSet`.
- Produces:
  - `withdrawals.repository.ts`: `listTaggedCards(db, { leagueId; userId }): Promise<TaggedCardRow[]>` (active or hidden cards where `card_tags.user_id = userId`, newest first, with media); `isTagged(db, { cardId; userId }): Promise<boolean>`.
  - `withdrawals.service.ts`: `listTaggedCards(m): Promise<TaggedCard[]>` (image sizes `[256, 768]`); `withdraw(m, cardId): Promise<void>` — transaction: `lockLeagueEconomyExclusive` → card in league and not removed (404) → `canWithdrawCard({ isTagged, isAuthor })` false → 403 `WITHDRAW_NOT_ALLOWED` → `removeInTx(reason 'withdrawn', actorId)` + `card.withdrawn` audit → `afterCommit`.
  - `card-views.ts`: `canWithdraw` = `canWithdrawCard(...)` for owned, locked and hidden details (the viewer's own tag/authorship only, so nothing about other tags leaks).
  - Routes (`member`): `GET /api/leagues/:leagueId/me/tagged-cards` → `TaggedCard[]`; `POST /api/leagues/:leagueId/cards/:cardId/withdraw` (`rateLimits.adminAction`) → 204.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify:** as a tagged member who owns no copy → `/me/tagged-cards` lists the card with an image; `GET …/cards/:id` (locked) has `canWithdraw: true` and still no `/media/`; `POST …/withdraw` → 204, owners compensated, files deleted (same checks as Task 7); a non-tagged non-author → 403 `WITHDRAW_NOT_ALLOWED`; the author on their own card → 204; a second withdraw → 404.
- [ ] **Step 3: Commit** (after go-ahead): `feat(api): let tagged members withdraw cards they appear in`

---

### Task 9: API — member removal side effects, leave league, ownership transfer

**Files:**
- Modify: `apps/api/src/features/members/{members.service,members.routes,members.repository}.ts`, `apps/api/src/features/card-removal/card-removal.repository.ts`, `deps.ts`

**Interfaces:**
- Consumes: `canRemoveMember`, `canTransferOwnership`, `canLeaveLeague`, `CardRemoval`, `findCardIdsByAuthor`, `listOpenUploadKeys`, `lockLeagueEconomyExclusive`.
- Produces:
  - `members.repository.ts`: `listMembers` adds `authoredCardCount` (count of active + hidden cards by author in the league); `transferOwnership(db, { leagueId; fromUserId; toUserId }): Promise<void>` (demote owner to `admin` first, then promote the target, inside one transaction — the partial unique index allows one owner); `clearMemberTraces(db, { leagueId; userId })` — deletes their `card_tags` and `reactions` on that league's cards and sets `cards.discovered_by_id = null` (keeping `discovered_at`, so the credit reads "Ancien membre").
  - `members.service.ts`:
    - private `detachMember(tx, m, targetUserId, reason: 'member_removed' | 'member_left')`: `lockLeagueEconomyExclusive` → `removeInTx(findCardIdsByAuthor)` → open uploads of the target in that league: collect keys, `deleteUploads` → `clearMemberTraces` → `deleteMember` (cascades their wallet and copies — no compensation for the departing member's own copies) → returns outcome + upload keys.
    - `removeMember` uses `detachMember(…, 'member_removed')`, audit `member.removed` with `{ role, removedCards }`, then `afterCommit` + `enqueueStorageDelete(uploadKeys)`.
    - `leaveLeague(m): Promise<void>` — `canLeaveLeague(m.role)` false → 409 `LEAVE_NOT_ALLOWED`; `detachMember(…, 'member_left')`; audit `member.left`.
    - `transferOwnership(m, targetUserId)` — `canTransferOwnership` false → 403; audit `league.ownership_transferred` `{ from, to }`.
    - `toSummary` fills `authoredCardCount` and `canTransferOwnership`.
  - Routes: `DELETE /api/leagues/:leagueId/membership` (`member`) → 204; `POST /api/leagues/:leagueId/ownership` (`owner` via `requireLeagueRole('owner')`, body `transferOwnershipBodySchema`) → 204.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify:**
  - Remove a member who authored 2 cards owned by others → both cards gone with tombstones, owners compensated, files deleted; the member's wallet and copies gone; their tags on other cards gone; a card they discovered shows `discoveredBy: { userId: null, displayUsername: null }`.
  - The removed member's own `GET /api/leagues/$L/cards` → 403/404 (layout redirect, Task 15 purges their caches).
  - Leave as admin → 204, same effects; as owner → 409 `LEAVE_NOT_ALLOWED`.
  - Transfer to a member → 403; to an admin → 204, roles swapped (`select user_id, role from league_members where league_id = '$L'`); the new owner now gets `canIssueResetCode: true` for members whose home league is `L`, the old owner `false`.
- [ ] **Step 3: Commit** (after go-ahead): `feat(api): handle member cards on removal, add leave and ownership transfer`

---

### Task 10: API — self-service account deletion with re-authentication

**Files:**
- Create: `apps/api/src/features/account/{account.routes,account.service,account.repository}.ts`
- Modify: `apps/api/src/auth/auth.gateway.ts`, `apps/api/src/features/members/members.service.ts` (export `detachMember` as a reusable function taking `tx`), `deps.ts`, `app.ts`

**Interfaces:**
- Consumes: `accountDeletionPlan`, `CardRemoval`, `detachMember` (Task 9), `lockLeagueEconomyExclusive`, `deleteAccountBodySchema`.
- Produces:
  - `auth.gateway.ts`: `AuthSession` gains `sessionCreatedAt: Date`; `verifyPassword(userId: string, password: string): Promise<boolean>` (credential account via `ctx.internalAdapter.findAccounts`, `ctx.password.verify`; no credential account → false).
  - `account.repository.ts`: `listOwnedLeagues(db, userId): Promise<OwnedLeague[]>`; `listMembershipLeagueIds(db, userId): Promise<string[]>` (sorted); `listLeagueCardIds(db, leagueId)`; `deleteLeague(db, leagueId)`; `deleteUserRow(db, userId)` (cascades sessions, accounts, passkeys, tags, reactions, compensations; `audit_log` and `cards.author_id`/`discovered_by_id` set null).
  - `account.service.ts`: `FRESH_SESSION_MS = 5 * 60_000`; `getDeletionPreview(session): Promise<AccountDeletionPreview>`; `deleteAccount(session, body): Promise<void>`:
    1. `confirmUsername.toLowerCase() !== session.username.toLowerCase()` → 400 `CONFIRMATION_MISMATCH`.
    2. Re-auth: `password` given → `verifyPassword` false → 403 `REAUTH_REQUIRED`; no password → session older than 5 min → 403 `REAUTH_REQUIRED`.
    3. `accountDeletionPlan(listOwnedLeagues)`; `blocking` non-empty → 409 `OWNERSHIP_TRANSFER_REQUIRED` with `{ leagues: [{ leagueId, name }] }`.
    4. One transaction: for each solo league → `lockLeagueEconomyExclusive` → `removeInTx(all its cards, 'league_deleted')` → `deleteLeague` (audit `league.deleted` with `leagueId: null`, metadata `{ leagueId, name }`); for every other membership in sorted league order → `detachMember(tx, …, 'account_deleted')`; remaining open uploads of the user anywhere → keys + `deleteUploads`; audit `account.deleted` (`actorId: null`, metadata `{ username }`); `deleteUserRow`.
    5. After commit: `afterCommit` per league, `enqueueStorageDelete(uploadKeys)`.
  - Routes: `GET /api/me/account-deletion` (`authenticate`) → preview; `DELETE /api/me` (`authenticate`, body `deleteAccountBodySchema`, `rateLimits.accountDelete`) → 204 and clears the Better Auth session cookie (reuse the cookie name/attributes Better Auth set: expire it with `reply.clearCookie` for the names returned by `auth.$context.authCookies`; verify the API).

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify** (a disposable user `Z`, created through an invitation):
  - `Z` owns a league with another member → preview lists it in `blocking`; `DELETE /api/me` → 409 `OWNERSHIP_TRANSFER_REQUIRED`.
  - Wrong confirmation → 400; no password and a session older than 5 min (`update session set created_at = now() - interval '10 minutes' where user_id = 'Z'`) → 403 `REAUTH_REQUIRED`; wrong password → 403.
  - Correct password: 204; `select count(*)` for `Z` in `"user"`, `session`, `account`, `passkey`, `league_members`, `member_wallets`, `card_copies`, `uploads`, `card_tags`, `reactions` → all 0; `Z`'s cards tombstoned with owners compensated; `Z`'s solo league gone; `audit_log` rows of `Z` kept with null actor; a card `Z` discovered shows "Ancien membre"; the next request with the old cookie → 401.
  - Review Focus 3: start an upload as a second disposable user, delete the account while `media.process` is running (stop the worker mid-way with `portly stop storix/worker --json`, delete, restart) → the job fails or no-ops without crashing the worker, the incoming object is deleted by the job or by the GC.
  - Passkey path: sign in with a passkey in the browser, then `DELETE /api/me` without password within 5 min → 204.
- [ ] **Step 3: Commit** (after go-ahead): `feat(api): add self-service account deletion with re-authentication`

---

### Task 11: Web — league settings screen with rarity distribution preview

**Files:**
- Create: `apps/web/src/features/league-settings/{league-settings.api,league-settings.queries,use-league-settings,use-rarity-preview}.ts`, `apps/web/src/features/league-settings/components/{settings-form,weight-slider,distribution-preview,number-setting}.tsx`
- Modify: `apps/web/src/routes/_authed/l.$leagueId.admin.tsx`, `apps/web/src/styles/game.css` (range input styling)

**Interfaces:**
- Consumes: `leagueSettingsViewSchema`, `rarityPreviewSchema`, `TIER_LABELS`, `TIER_CLASS`, `Segmented`, `Field`, `Input`, `Button`, `Notice`, `Chip`.
- Produces:
  - API/queries: `fetchSettings`, `saveSettings`, `fetchRarityPreview(leagueId, weights)`; keys `['leagues', id, 'settings']`, `['leagues', id, 'settings', 'preview', weights]` (`placeholderData: keepPreviousData`, `staleTime: 30_000`).
  - `useLeagueSettings(leagueId)` → `{ view, save, isSaving, error }` (on save: replace the cache, invalidate `['leagues', id, 'wallet']` and the upload quota).
  - `useRarityPreview(leagueId, weights)` — weights debounced 300 ms before they enter the query key.
  - `WeightSlider({ label, value, onChange })` — `<input type="range" min=0 max=5 step=0.5>`, value shown as `×{value}`, accent track.
  - `DistributionPreview({ preview, isFetching })` — one row per tier in tier order: label in tier color, two bars (`Actuel` muted, `Après` tier color) with counts; footer `{changed} cartes changeraient de rareté` (`Aucune carte ne change` when 0).
  - `NumberSetting({ label, hint, value, min, max, unit, onChange })` — numeric `Input` + `hint`.
  - `SettingsForm` sections: `Boosters` (`Un booster toutes les` minutes with hint `soit 4 h`, `Stock maximum`, `Cadeau d'arrivée`), `Photos` (`Photos par membre et par jour`), `Nouvelles cartes` (`Hors des boosters pendant` minutes, preset chips `0`, `1 h`, `12 h`, `24 h`), `Rareté` (three sliders: `Auteur peu actif`, `Ancienneté de la photo`, `Réactions` + preview), `Mythiques` read-only `{mythicCount} / 3`. Local state starts from the server view; `Enregistrer` disabled while invalid or unchanged; inline French field errors from the 400 `details`; success notice `Réglages enregistrés. Les raretés sont en cours de recalcul.`
  - Admin route: tabs `Membres`, `Invitations`, `Cartes` (Task 12), `Réglages`; tab in the search params (`?tab=`) so a reload keeps it.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify** (browser, 390 px): moving a slider updates the preview after ~300 ms without flicker (previous data kept); all three at 0 → `Enregistrer` disabled and a hint `Au moins un critère doit compter`; save interval `1` → home widget countdown becomes `01:00` after refresh; delay preset `0` then upload a photo → it can be pulled at once; a member opening `/admin?tab=settings` is redirected home.
- [ ] **Step 3: Commit** (after go-ahead): `feat(web): add league settings with rarity distribution preview`

---

### Task 12: Web — admin card moderation tab

**Files:**
- Create: `apps/web/src/features/moderation/{moderation.api,moderation.queries,use-admin-cards,use-card-moderation}.ts`, `apps/web/src/features/moderation/components/{admin-card-list,admin-card-sheet,tier-pin-picker,tier-bounds-picker,delete-card-dialog}.tsx`
- Modify: `apps/web/src/routes/_authed/l.$leagueId.admin.tsx`

**Interfaces:**
- Consumes: Task 2 admin schemas, `CardFace`, `CardImage`, `Dialog`, `Chip`, `Button`, `TIER_LABELS`, `TIER_CLASS`, `formatCardNumber`.
- Produces:
  - `useAdminCards(leagueId, filter)` — infinite query `['leagues', id, 'admin', 'cards', filter]`.
  - `useCardModeration(leagueId)` → `{ setVisibility, pinTier, setBounds, validateDate, deleteCard }` (`useMutation` each; success replaces the card in every admin page via `setQueryData`, invalidates `['leagues', id, 'cards']` and settings `mythicCount`; delete removes it from the pages).
  - `AdminCardList({ cards, onSelect, onLoadMore, hasMore })` — filter chips `Toutes`, `Actives`, `Masquées`, `Hors boosters`, `Mythiques`; 3-column grid of `sm` faces; a `Masquée` pill on hidden cards, `Mythique` rainbow on pinned Mythics, a clock pill `Hors boosters` on provisional ones; `Charger plus`.
  - `AdminCardSheet({ card, mythicCount, … })` — `Dialog` with `md` face, title, `Photo de`, `#047`; pills `{tier}` + `source` (`Calculée`, `Bornée`, `Fixée`) + `Calculée : {computedTier}` when different; `Prise le {date}` with toggle `Date vérifiée` (disabled with `Pas de date` when null); `TierPinPicker` (`Auto` + six tiers, Mythique disabled with `3 / 3 Mythiques` when the cap is reached and the card is not Mythic); `TierBoundsPicker` (min and max among five computed tiers or `Aucun`, disabled with `Ignorées : rareté fixée` when pinned); `Masquer` / `Réafficher`; danger `Supprimer…`.
  - `DeleteCardDialog` — `Supprimer définitivement la carte #047 ?`, body `Elle disparaît de toutes les collections. Les {copiesInLeague} exemplaires sont remboursés en paillettes. C'est irréversible.`, buttons `Annuler` / danger `Supprimer`.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify** (browser): each action updates the sheet and the grid without reload; pinning a 4th Mythic is impossible from the UI and a forced request shows the French cap message; hiding a card → a member who owns it sees `Masquée` in their collection after refresh; deleting → the card leaves the grid, the dialog closes, the owner's dust increases on their next home refresh.
- [ ] **Step 3: Commit** (after go-ahead): `feat(web): add admin card moderation`

---

### Task 13: Web — hidden cards, withdrawal and "photos où tu apparais"

**Files:**
- Create: `apps/web/src/features/cards/components/{hidden-card-face,hidden-card-detail}.tsx`, `apps/web/src/features/withdrawals/{withdrawals.api,use-tagged-cards,use-withdraw-card}.ts`, `apps/web/src/features/withdrawals/components/{tagged-card-list,withdraw-card-dialog}.tsx`, `apps/web/src/routes/_authed/l.$leagueId.tagged.tsx`
- Modify: `apps/web/src/features/cards/components/{collection-card-view,card-detail,locked-card-detail}.tsx`, `apps/web/src/routes/_authed/l.$leagueId.cards.$cardId.tsx`, `apps/web/src/routes/_authed/l.$leagueId.profile.tsx`, `apps/web/src/features/boosters/components/booster-stage.tsx`, `apps/web/src/components/ui/icon.tsx` (`eye-off`)

**Interfaces:**
- Consumes: `hiddenCardSummarySchema`, `hiddenCardDetailSchema`, `taggedCardSchema`, `LockedCardFace` (Plan 3), `Dialog`.
- Produces:
  - `HiddenCardFace({ size, tier, thumbhash })` — `LockedCardFace` look with `eye-off` icon and band `Masquée`; no `<img>`.
  - `HiddenCardDetail({ card, onWithdraw })` — `xl` hidden face, `#047`, text `Cette carte a été masquée par un admin de la ligue. Tu la retrouveras si elle est réaffichée.`; withdraw button when `canWithdraw`.
  - `WithdrawCardDialog({ number, onConfirm, isPending })` — `Retirer la carte #047 de la ligue ?` / `Elle disparaît pour tout le monde et ses propriétaires sont remboursés en paillettes. C'est irréversible.`
  - `useWithdrawCard(leagueId)` — on success invalidates cards, tagged cards, wallet; navigates back to the collection.
  - Owned and locked details show a ghost `Retirer cette photo` when `canWithdraw`.
  - Route `/_authed/l/$leagueId/tagged` (`TopBar` `Photos où tu apparais`): `TaggedCardList` with images, `Masquée` pill, a `Retirer` button per card; empty state `Personne ne t'a identifié sur une photo pour l'instant.` Profile links to it (`Photos où tu apparais`).
  - `BoosterStage`: `BOOSTER_CONTENT_REMOVED` → `EmptyState` with the French message and `Voir ma collection`.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify** (browser): hidden card in the collection is a `Masquée` silhouette with no `/media/` request (DevTools Network); its detail has no image and no actions; the tagged screen lists the right cards with images; withdrawing from it removes the card for everyone (second browser profile); Review Focus 2: reload a booster URL after hiding one of its cards → French message, no crash.
- [ ] **Step 3: Commit** (after go-ahead): `feat(web): add hidden cards, photo withdrawal and tagged photos`

---

### Task 14: Web — ownership transfer, leave league, member removal copy, account deletion

**Files:**
- Create: `apps/web/src/features/members/{use-transfer-ownership,use-leave-league}.ts`, `apps/web/src/features/members/components/{transfer-ownership-dialog,leave-league-section}.tsx`, `apps/web/src/features/account/{account.api,use-account-deletion}.ts`, `apps/web/src/features/account/components/delete-account-section.tsx`
- Modify: `apps/web/src/features/members/components/{member-row,member-list}.tsx`, `apps/web/src/features/members/members.api.ts`, `apps/web/src/routes/_authed/l.$leagueId.profile.tsx`

**Interfaces:**
- Consumes: Task 2 member/account schemas, `authClient.signIn.passkey` (`lib/auth-client`, through a hook), `clearApiCache`, `purgeAllCaches` (Task 15 — implement it here if Task 15 is not done yet and move it there), `useLogout` patterns.
- Produces:
  - `MemberRow`: `Transférer la propriété` on admins when `canTransferOwnership`; the removal dialog body becomes `Ses {authoredCardCount} cartes seront retirées de la ligue et leurs propriétaires remboursés en paillettes.` (omitted when 0).
  - `TransferOwnershipDialog` — `Transférer la ligue à {name} ?` / `Tu deviens admin. {name} pourra générer les codes de réinitialisation des membres dont c'est la ligue d'origine.`
  - `LeaveLeagueSection({ league, isHomeLeague })` in the profile for the current league: owner → `Transfère la propriété depuis l'administration avant de quitter la ligue.` with a link; others → danger `Quitter la ligue` opening a dialog `Tes cartes seront retirées de la ligue et tes exemplaires perdus.` plus, when `isHomeLeague` (`me` exposes `homeLeagueId`; add it to `meResponseSchema` if absent), `C'est ta ligue d'origine : plus personne ne pourra te générer de code de réinitialisation.`; on success purge that league's caches (Task 15 helper) and navigate to `/`.
  - `useAccountDeletion()` → `{ preview, reauthWithPasskey, deleteAccount, isPending, error }` — after 204: `queryClient.clear()`, `purgeAllCaches()`, remove the user's `STORAGE_KEYS`, navigate `/login` with `?deleted=1` (the login screen shows `Ton compte a été supprimé.`).
  - `DeleteAccountSection` (bottom of the profile): `Supprimer mon compte` → dialog: blocking leagues listed with `Transfère d'abord : {names}` and the confirm disabled; otherwise the summary (`{authoredCardCount} cartes retirées`, solo leagues deleted by name), `Tape {username} pour confirmer`, password field or `Confirmer avec une passkey` (`requiresPassword` false after a passkey sign-in), danger `Supprimer définitivement`.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify** (browser): transfer swaps the role labels in the member list; leaving as a member lands on `/` without the league, and the old league's images are gone from Cache Storage; the owner sees the transfer hint instead of the leave button; account deletion with a blocking league shows the names and cannot be confirmed; with a disposable account it ends on `/login` with the notice, and the back button does not show cached league data.
- [ ] **Step 3: Commit** (after go-ahead): `feat(web): add ownership transfer, leave league and account deletion`

---

### Task 15: Web — removed-cards sync and cache purge

**Files:**
- Create: `apps/web/src/features/privacy/{removals.api,use-removed-cards-sync,purge-cache}.ts`, `apps/web/src/features/privacy/components/removal-notice.tsx`
- Modify: `apps/web/src/routes/_authed/l.$leagueId.tsx`, `apps/web/src/routes/_authed/l.$leagueId.index.tsx`, `apps/web/src/lib/storage.ts`, `apps/web/src/features/auth/use-logout.ts` (unchanged behavior, reuse helper)

**Interfaces:**
- Consumes: `removedCardsSchema`, `mediaCachePathPrefix`, `leagueMediaPrefix`, `MEDIA_CACHE_NAME`, `API_CACHE_NAME`, `readStorage`/`writeStorage`.
- Produces:
  - `STORAGE_KEYS.removalCursor(userId, leagueId)` and `STORAGE_KEYS.acknowledgedRemovals(userId, leagueId)` (JSON array, last 200 ids).
  - `purge-cache.ts` (window `caches` API, every failure logged, never thrown):
    - `purgeMediaPrefixes(prefixes: readonly string[]): Promise<number>` — deletes `MEDIA_CACHE_NAME` entries whose pathname starts with any `mediaCachePathPrefix(prefix)`.
    - `purgeLeagueApiEntries(leagueId: string): Promise<void>` — deletes `API_CACHE_NAME` entries whose pathname starts with `/api/leagues/{leagueId}`.
    - `purgeLeagueCaches(queryClient, leagueId)` — both of the above with `leagueMediaPrefix(leagueId)` + `queryClient.removeQueries({ queryKey: ['leagues', leagueId] })`.
    - `purgeAllCaches(): Promise<void>` — deletes both caches entirely.
  - `useRemovedCardsSync(userId, leagueId): { notice: { count: number; dust: number } | null; acknowledge(): void }` — `useQuery` key `['leagues', id, 'removed-cards']`, `refetchOnWindowFocus: true`, `staleTime: 60_000`, `since` = stored cursor; on data with removals: `purgeMediaPrefixes`, `purgeLeagueApiEntries`, `removeQueries` for each removed detail key, invalidate `['leagues', id, 'cards']`, `wallet`, `reveals`, `admin`; then store the new cursor. `notice` sums unacknowledged entries with `compensation > 0`.
  - `RemovalNotice({ count, dust, onClose })` on the home screen: `{count} carte(s) retirée(s) de la ligue · +{dust} paillettes` with a close button.
  - League layout: runs `useRemovedCardsSync`; the loader's not-a-member branch (and any 403/404 on the league detail) calls `purgeLeagueCaches` before redirecting.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify** (two browser profiles: owner `M` with images cached, admin `A`):
  - `M` browses the collection (images cached), goes offline; `A` deletes one of `M`'s cards; `M` comes back online and focuses the tab → DevTools Cache Storage `storix-media-v1` has no entry under that card's prefix, the card is gone from the grid, the notice shows `+N paillettes` once and stays gone after closing and reloading (Review Focus 4).
  - Clear the cursor in localStorage → the next sync returns the last 30 days; purging again is harmless.
  - `A` removes `M` from the league → `M`'s next navigation redirects to `/`, and Cache Storage has no `/media/img/{L}/` entry nor `/api/leagues/{L}` entry.
- [ ] **Step 3: Commit** (after go-ahead): `feat(web): purge removed cards from caches on sync`

---

### Task 16: README, merge, deploy to Railway, verify in production

Use the Railway CLI (prefix every call with `RAILWAY_CALLER="skill:use-railway@1.2.1" RAILWAY_AGENT_SESSION=<one id for the task>`, explicit `--service` / `--environment production`, `railway <cmd> --help` before any unpinned flag). Services: `api`, `worker` (GitHub `main`), `Postgres`, bucket, CDN on `api`; origin `https://api-production-2b79.up.railway.app`.

**Files:**
- Modify: `README.md` (full rewrite, English), `docs/superpowers/plans/2026-11-07-storix-roadmap.md` (Plans 3 and 4 done, deferred list)

**README outline (each section short, facts from the code, no marketing):**
1. `# Storix` — one paragraph: invite-only PWA, leagues, photos → cards, boosters. Live at `https://storix.tristanhourtoulle.fr` (state the Railway domain `https://api-production-2b79.up.railway.app` as the fallback while DNS is pending; Step 5 decides which one is current).
2. `## Features` — accounts and leagues (invites, roles, reset codes, passkeys), photos → cards (pipeline, privacy), game (rarity engine, boosters, pity, dust, craft, foil, reactions, discovery), admin (settings, moderation), privacy (withdrawal, removal + compensation, file deletion, client purge, account deletion).
3. `## Architecture` — the package tree, layering rules, request flow diagram in text (web → api → Postgres / bucket, api → pg-boss → worker), jobs table (`media.process`, `media.sweep-incoming` every 15 min, `rarity.recompute` debounced, `rarity.nightly` 03:00 Paris, `storage.delete`, `storage.gc` Sunday 04:00 Paris), media serving and caching (Plan 0 decisions), economy lock.
4. `## Game rules` — the spec values in one table (tiers, quotas, slots, pity, foil, dust, craft/foil costs, cadence defaults, Mythic cap).
5. `## Local setup` — keep the current steps (nvm, pnpm, `.env`, `pnpm dev:db`, migrate, bootstrap, Portly), plus "testing the game quickly": admin → Réglages → interval 1 min, delay 0.
6. `## Test credentials` — no shared credentials; create with the bootstrap CLI locally; in production Tristan creates accounts and invitations; never commit `.env*`.
7. `## Scripts` and `## Ports` — current tables.
8. `## Deploy (Railway)` — services, build/start/pre-deploy commands, variables, custom domain steps, CDN, first user bootstrap, how to read logs.
9. `## Privacy` — what is stored, EXIF/GPS stripped, signed URLs, removal semantics, retention (tombstones 35 days, GC weekly).

- [ ] **Step 1: Local gate.** `pnpm lint && pnpm typecheck && pnpm test && pnpm build` → PASS; production preview through Portly (`storix/prod-preview`, `storix/prod-worker`) on `http://localhost:3021`: save settings, hide/unhide, delete a card, withdraw, leave, delete a disposable account.
- [ ] **Step 2: Write the README** and update the roadmap.
- [ ] **Step 3: Commit** (after go-ahead): `docs(readme): document the complete storix mvp`
- [ ] **Step 4: Merge and push** (authorized): `git checkout feat/foundation && git merge --no-ff feat/admin-privacy`, `git checkout main && git merge --no-ff feat/foundation`, `git push origin main feat/foundation feat/admin-privacy` (no force push).
- [ ] **Step 5: Watch the deploys.** `railway logs --service api --build --lines 200` until `migrate:prod` applies 0004 and `/api/health` passes; `railway logs --service worker --lines 100` shows the `storage.delete` / `storage.gc` queues created. On failure apply superpowers:systematic-debugging. Check the domain: `dig +short storix.tristanhourtoulle.fr` and `railway domain --service api` (verify the subcommand with `--help`): when it resolves with a valid certificate, the README says the custom domain is live; otherwise keep the Railway domain wording and tell Tristan which CNAME is missing.
- [ ] **Step 6: Verify production** (`O=<live origin>`, session cookie from a real login, a disposable member invited for the test):
  - `curl -s $O/api/health` → ok; `GET $O/api/leagues/$L/settings` as admin → defaults or Tristan's values; as member → 403.
  - In the phone browser: Réglages preview moves with the sliders; save → worker log shows a recompute; hide and unhide a test card; the disposable member uploads a photo tagging themselves, withdraws it → card gone, `railway logs --service worker` shows `storage.delete` done; `curl -sI $O/media/<old url of that card>` → 404.
  - `GET $O/api/leagues/$L/removed-cards` → contains the withdrawn card.
  - Delete the disposable account from its profile → `/login` with the notice; its old cookie → 401.
  - `curl -sI $O/api/leagues/$L/removed-cards` → `cache-control: no-store`; one live `/media/` URL still returns `x-cache: HIT` on a second request.
- [ ] **Step 7: Report** to Tristan: production checks with outputs, the live URL, and every "my call" below.

---

## Self-review notes

- **Spec coverage:** 4.7 admin — members (role, remove: Plan 1 + Task 9), invitations (Plan 1), reset codes (Plan 1, transfer implications Task 9), cards hide/delete/pin/validate date/event Mythic (Tasks 7, 12), settings weights/cadence/quota (Tasks 6, 11); 5.1 precedence and admin bounds (Task 7 uses Plan 3 `resolveEffectiveTier`), "every override is logged" (audit + history, Task 7), recompute on every settings change (Task 6), Mythic cap 3 (Tasks 1, 7); 5.6 tagged withdrawal (Tasks 8, 13), card disappearance for withdrawal / admin deletion / member removal / account deletion with compensation from the copy's `tier_at_mint` and real bucket deletion (Tasks 4, 5, 7-10), "former member" credit (Tasks 9, 10), hiding reversible without compensation, out of boosters, blurred in collections (Tasks 7, 13), client cache purge on sync (Task 15), signed URLs ≤ 48 h (unchanged Plan 2); 6.3 owner/admin roles, home-league reset rule after transfer/leave (Tasks 9, 14); 6.5 layering, domain-only tests (all). Plan 1 deferrals: ownership transfer and leave (Task 9). Final README + deploy (Task 16).
- **Type consistency checked:** `RemovalReason` (domain) ↔ `removal_reason` enum; `RemovedCopy` ↔ `listCopiesOfCards`; `RemovalOutcome.objectKeys` ↔ `enqueueStorageDelete(keys)` ↔ `storageDeletePayloadSchema`; `mediaPrefix` used by tombstones, GC and the web purge; `boosterEligibleBefore(now, delayMinutes)` everywhere with `settings.newCardDelayMinutes`; `canWithdraw` on owned/locked/hidden details and `taggedCardSchema`; `AuthSession.sessionCreatedAt` ↔ `FRESH_SESSION_MS`.
- **My calls (to confirm with Tristan):**
  1. Concurrency: a per-league advisory "economy" lock, shared for every wallet transaction (taken inside Plan 3's `lockWallet`) and exclusive for every removal, instead of row-lock ordering; removals are rare, so blocking openings for a few ms is fine.
  2. File deletion is enqueued after commit (best effort) with the weekly GC as the safety net, instead of a transactional outbox table.
  3. The removal sync uses tombstones (`card_removals`, kept 35 days) carrying the media prefix, so the client purges by prefix even when its query cache no longer knows the card; initial sync window 30 days; cursor = server time − 10 min, purges are idempotent. There is no IndexedDB query persister in the codebase (offline reads are the SW `storix-api-v2` Cache Storage), so "IndexedDB purge" is done on Cache Storage + the in-memory query cache.
  4. A removed-card notice (`+N paillettes`) on the home, backed by a `card_compensations` table that also serves as the compensation ledger.
  5. Hidden cards: only owners see them, as a `Masquée` silhouette with no title and no image; no recycle/craft/reaction on them; they are not counted in `owned / total`; their images are not purged from devices (reversible); a hidden card's booster replay answers 410 like a removed one.
  6. Admins see every card with its image in the moderation tab, and a tagged member sees the photos they appear in (with image) on "Photos où tu apparais" — both are exceptions to the locked rule, needed to moderate and to exercise the withdrawal right. The card author may also withdraw their own card.
  7. Member removal and leaving remove the member's authored cards (with compensation to others), their open uploads, their tags and reactions in that league, set their "discovered by" credits to "Ancien membre", and drop their own copies and wallet without compensation.
  8. Account deletion: blocked while the user owns a league with other members; a league where the user is alone is deleted with the account; re-auth = password, or a passkey sign-in less than 5 minutes old; typed confirmation = the username (case-insensitive); audit entries are kept with a null actor.
  9. Ownership can only go to an admin (spec 4.7/ruling); the previous owner becomes admin; reset-code rights follow the new owner automatically; leaving one's home league ends reset-code eligibility (existing Plan 1 rule), shown as a warning.
  10. Pin/bounds apply the effective tier immediately in the API (with a history row) and then enqueue the full recompute; date validation is a reversible toggle and cannot edit the date.
  11. Settings ranges: interval 1-10 080 min, max stock 1-20, join gift 0-20, quota 1-50 per day, new-card delay 0-10 080 min, weight sliders 0-5 step 0.5 (schema accepts 0-10, sum > 0); lowering max stock never removes boosters already in stock; join gift changes only affect new wallets.
  12. Orphan GC deletes `img/` objects without a media row after 24 h and `incoming/` objects without a live upload after 48 h, never anything under another prefix, and purges tombstones older than 35 days, weekly on Sunday 04:00 Europe/Paris plus once at each worker startup.
  13. Settings-schema tests live in `packages/shared/src/schemas/league-settings.test.ts` (Zod cannot enter `domain/`), as explicitly allowed for this plan.
- **Deferred on purpose:** activity feed, booster replay tooling, an admin audit-log viewer, editing a capture date, league rename/deletion by its owner while other members exist, trades/Wonder Pick/wishlist/duels/sets (out of MVP).
