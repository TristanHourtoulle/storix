# Storix — "Nouveautés" booster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax.
>
> **Commits:** each task ends with a commit step that runs ONLY when the orchestrator says so. Without it, stop at the step and report.

**Goal:** members see a sealed "Mise à jour" booster after an update; tearing it shows each new feature as a card with its aura, then a recap. Profil › Quoi de neuf lists every release as a replayable pack. A per-user, server-side, monotonic "last release seen" pointer syncs across devices.

**Architecture:** release notes are a versioned TypeScript catalog in `@storix/shared` (validated by a unit test). Pure domain helpers compute unseen releases and build the merged pack. The API stores one row per user in `whats_new_reads` and exposes state, mark-seen and per-league "Essayer" targets. The web app renders an overlay that reuses the arcade booster stage (Director, pack, cards, slots, CSS) with an injected sound sink that only plays interface sounds.

**Spec:** `docs/superpowers/specs/2026-11-10-storix-whats-new-design.md` (read it fully before any task; section numbers below refer to it). Design system: https://claude.ai/artifact/PnujcYudoKxB6yCvdwWchz (`project/README.md`): tokens, French copy rules, reduced motion.

**Branch / worktree:** `feat/whats-new-booster` in `/Users/tristanhourtoulle/.paradev/sessions/storix-whats-new` (off `origin/main` 0bd359b).

## Global constraints

- Node 24 (`source ~/.nvm/nvm.sh && nvm use 24`). No new dependency. Keep every pinned version.
- TypeScript strict, `noUncheckedIndexedAccess`, no `any`, immutable data, Zod at every boundary.
- NO comments in code except basic JSDoc on exported functions. Code, logs, commits in English; UI copy in French (tutoiement, sentence case, no emoji, ✦ only glyph).
- Layering exactly as `eslint.config.js`: routes HTTP only; services = use cases (type-only imports from `@storix/db`); repositories = Drizzle only; `packages/shared/src/domain` pure (imports only `./*`); web components/routes presentational (no `*.api`, no `lib/http`), data in hooks.
- Tests: only the pure domain + catalog validation (vitest in `@storix/shared`). Everything else is checked by typecheck, lint, build and the browser E2E (Task 12).
- Never boot or stop servers outside Portly, never touch Docker, `.env`, `db:push`, seeds. Migration generation uses a dummy URL (no connection): `DATABASE_URL=postgres://x@localhost/x pnpm db:generate`.
- Standard verify (run from the worktree root, all must pass): `pnpm typecheck && pnpm lint && pnpm test`. Web tasks also: `pnpm --filter @storix/web build`.
- If a real name differs from this plan, keep the behaviour, use the real name and say so in the report.

## Parallelization map

| Group | Tasks | Can run in parallel? | Shared files (serialize) |
|-------|-------|----------------------|--------------------------|
| G1 contracts | T1 → T2 | T1 then T2 (T2 imports T1) | `packages/shared/src/index.ts`, `schemas/index.ts`, `domain/index.ts` |
| G2 server | T3 → T4 | after G1; T3 then T4 | `apps/api/src/deps.ts`, `app.ts`, `users.repository.ts` |
| G3 web foundations | T5, T6, T7 | after G1, **in parallel with G2 and with each other** | T5: `features/sound/*` · T6: `features/boosters/*` · T7: `features/whats-new/*.api.ts|queries|hooks` (disjoint) |
| G4 web UI | T8 → T9 → T10 → T11 | after T5+T6+T7 (T8 also needs T4 for real data only at E2E) | T8/T9 both in `features/whats-new/components/*` and `styles/whats-new.css`; T10 and T11 touch `l.$leagueId.tsx`, `bottom-nav.tsx`, `settings-list.tsx`, profile index |
| G5 verify | T12 | last | — |

Write-agents in the same group that run in parallel must use separate worktrees or strictly disjoint files as listed.

---

## Task 1 — Shared contracts: schemas and catalog (spec §4.1, §4.3)

**Files**
- Create `packages/shared/src/schemas/whats-new.ts`
- Create `packages/shared/src/release-notes/catalog.ts`
- Create `packages/shared/src/release-notes/index.ts`
- Modify `packages/shared/src/schemas/index.ts` (export), `packages/shared/src/index.ts` (export `./release-notes`)

**Steps**
- [ ] `schemas/whats-new.ts`:
  - `NEWS_ILLUSTRATIONS = ['camera', 'stacks', 'showcase', 'share', 'sort'] as const`, `newsIllustrationSchema`.
  - `NEWS_TRY_TARGETS = ['add', 'collection-discovery', 'showcase-card', 'stack-card', 'none'] as const`, `newsTryTargetSchema`.
  - `releaseIdSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}(-[a-z])?$/)`.
  - `releaseNoteCardSchema` `{ key: kebab-case string, title: 1..32, body: 1..180, tier: cardTierSchema, illustration, tryTarget }`.
  - `releaseNoteSchema` `{ id: releaseIdSchema, publishedAt: z.iso.datetime({ offset: true }), cards: z.array(releaseNoteCardSchema).min(1).max(8) }`.
  - `whatsNewStateSchema` `{ seenReleaseId: releaseIdSchema.nullable(), unseenReleaseIds: z.array(releaseIdSchema) }`.
  - `markWhatsNewSeenBodySchema` `{ releaseId: releaseIdSchema }`.
  - `whatsNewTargetsSchema` `{ showcaseCardId: idSchema.nullable(), stackCardId: idSchema.nullable() }`.
  - Export inferred types: `NewsIllustration`, `NewsTryTarget`, `ReleaseNoteCard`, `ReleaseNote`, `WhatsNewState`, `MarkWhatsNewSeenBody`, `WhatsNewTargets`.
- [ ] `release-notes/catalog.ts`: `export const RELEASE_NOTES: readonly ReleaseNote[]` with release `2026-11-09` (`publishedAt: '2026-11-09T18:00:00+01:00'`) and the 5 cards of spec §4.1, copy verbatim.
- [ ] Use Zod 4 API as installed (`z.iso.datetime` exists in zod 4.6; check `node_modules/zod` typings if unsure).

**Acceptance:** `RELEASE_NOTES` typed against the schema types; no domain import from schemas. Standard verify passes.

**Commit:** `feat(shared): add what's new release notes catalog and contracts`

## Task 2 — Pure domain + tests (spec §4.2)

**Files**
- Create `packages/shared/src/domain/whats-new.ts`, `packages/shared/src/domain/whats-new.test.ts`
- Create `packages/shared/src/release-notes/catalog.test.ts`
- Modify `packages/shared/src/domain/index.ts`

**Steps**
- [ ] Domain declares its own minimal generic shapes (domain cannot import schemas): `interface DatedRelease { id: string; publishedAt: string }`, `interface ReleaseWithCards<C> extends DatedRelease { cards: readonly C[] }`.
- [ ] `unseenReleaseIds(releases, { seenReleaseId: string | null, seenAt: Date | null, memberSince: Date }): string[]` (releases are newest first): seen id in catalog → ids before it; seen id unknown → `publishedAt > seenAt`; no row → `publishedAt > memberSince`.
- [ ] `isNewerRelease(releases, candidateId, currentId: string | null): boolean` — false when candidate unknown; true when current is null or unknown or candidate index < current index.
- [ ] `buildNewsPack<C>(releases, { maxCards }): { newestId: string; newestPublishedAt: string; cards: C[]; overflowTitles: string[] } | null` with a `titleOf: (card: C) => string` parameter; null for an empty list.
- [ ] `whats-new.test.ts` (Arrange-Act-Assert, `should … when …`): empty catalog; no row before/after memberSince (boundary equal = seen); seen = newest → []; seen = middle → newer only; unknown seen id → by seenAt; isNewerRelease older/equal/newer/unknown/null; pack with 0, 3, 8, 9, 13 cards (cap and overflow order newest first).
- [ ] `catalog.test.ts`: every release parses `releaseNoteSchema`; ids unique; sorted by `publishedAt` desc; card keys unique per release.

**Acceptance:** `pnpm test` green with the new tests; domain imports only `./*`. Standard verify passes.

**Commit:** `feat(shared): compute unseen releases and merged news pack`

## Task 3 — DB table + migration (spec §4.2)

**Files**
- Create `packages/db/src/schema/whats-new.ts`
- Modify `packages/db/src/schema/index.ts`
- Generated: `packages/db/drizzle/0012_*.sql` + `meta/0012_snapshot.json` + `_journal.json`

**Steps**
- [ ] Table `whats_new_reads`: `userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' })`, `releaseId: text('release_id').notNull()`, `seenAt: timestamp('seen_at', { withTimezone: true }).notNull()`, `updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()`.
- [ ] `cd packages/db && DATABASE_URL=postgres://x@localhost/x pnpm db:generate --name whats_new_reads`. Read the SQL: only a `CREATE TABLE` + FK, nothing else. Do NOT apply it.

**Acceptance:** generated SQL creates exactly that table; standard verify passes.

**Commit:** `feat(db): add whats_new_reads table`

## Task 4 — API feature (spec §4.3)

**Files**
- Create `apps/api/src/features/whats-new/whats-new.repository.ts`, `whats-new.service.ts`, `whats-new.routes.ts`
- Modify `apps/api/src/features/users/users.repository.ts` (add `findMemberSince`), `apps/api/src/deps.ts`, `apps/api/src/app.ts`, `apps/api/src/http/rate-limit.ts` (add `whatsNewSeen` / `whatsNewSeenIp` limits, e.g. 30/min user, 60/min IP, same shape as `pushSubscription`)

**Steps**
- [ ] Repository (Drizzle only): `findWhatsNewRead(db, userId)`, `lockWhatsNewRead(db, userId)` (`for('update')`), `upsertWhatsNewRead(db, { userId, releaseId, now })` (`onConflictDoUpdate` on `user_id`), `findShowcaseCardId(db, { leagueId, userId })` (owned copies joined to cards with `status = 'active'`, order by effective tier rank desc — `coalesce(promoted_tier, tier)` mapped to rank via a `CASE` or the tier enum order — then `card_copies.created_at` desc, limit 1), `findStackCardId(db, { leagueId, userId })` (`card_copy_stacks` joined to active cards, `count > 0`, order by count desc, limit 1). Reuse existing visibility conditions from `features/cards/cards.repository.ts` if a helper exists.
- [ ] `users.repository.ts`: `findMemberSince(db, userId): Promise<Date | null>` (`user.createdAt`).
- [ ] Service `createWhatsNewService({ db, clock })`:
  - `getState(session)` → reads row + memberSince, returns `{ seenReleaseId, unseenReleaseIds }` via `unseenReleaseIds(RELEASE_NOTES, …)`.
  - `markSeen(session, releaseId)` → 400 `AppError('UNKNOWN_RELEASE', 400, 'Unknown release')` if not in catalog; `runInTransaction`: lock row, upsert only when `isNewerRelease`; returns the new state.
  - `getTargets(membership)` → `{ showcaseCardId, stackCardId }` in parallel (`Promise.all`).
- [ ] Routes: `GET /whats-new`, `POST /whats-new/seen` (body + response schemas, rate limits), `GET /leagues/:leagueId/whats-new/targets` (`requireLeagueRole('member')`, `leagueParamsSchema`). Register in `app.ts` with prefix `/api`, wire in `deps.ts`.

**Acceptance:** layering lint passes (no SQL in service, no Fastify outside routes). Standard verify passes. Report the exact SQL ordering used for the tier.

**Commit:** `feat(api): expose what's new state, mark seen and try targets`

## Task 5 — Sound names (spec §4.8) — parallel with T6, T7

**Files:** `apps/web/src/features/sound/sound-types.ts`, `library.ts`, `sound.ts`

**Steps**
- [ ] Add `{ name: 'newsTear' }` and `{ name: 'newsFlip' }` to `SoundRequest`; `SOUND_CATEGORY.newsTear = 'interface'`, `newsFlip = 'interface'`.
- [ ] `renderSound`: `newsTear` → `booster.burst(v)`, `newsFlip` → `booster.flip(v, 0.45)`.
- [ ] `hapticPattern`: `newsTear` → `[30, 40, 60]`.

**Acceptance:** exhaustive switch still compiles; web typecheck + lint pass.

**Commit:** `feat(web): add interface sounds for the what's new booster`

## Task 6 — Generalize arcade pieces (spec §4.9) — parallel with T5, T7

**Files:** `apps/web/src/features/boosters/arcade/director.ts`, `arcade/choreography.ts`, `arcade/pack-choreography.ts`, `use-arcade-opening.ts`, `components/arcade-pack.tsx`, `components/arcade-card.tsx`, `components/arcade-hud.tsx`, `components/booster-stage.tsx`, `apps/web/src/styles/booster-stage.css` (slot sizing only)

**Steps**
- [ ] `Director`: add `readonly sound: SoundSink` (type `(request: SoundRequest, delay?: number) => void`, exported from `director.ts`), constructor param after `canvas`, default `playSound`. Replace every `playSound(` in `choreography.ts` and `pack-choreography.ts` with `d.sound(` (same args). `use-arcade-opening.ts` keeps passing nothing (default).
- [ ] `ArcadePack`: props `{ count: number; subtitle?: string; isChargeHidden?: boolean }`; sub-label = `subtitle ?? (count > 1 ? \`${count} cartes\` : '1 carte')`; `isChargeHidden` adds a class that hides `.ar-pips` visually (keep it in the DOM for `collectLayers`).
- [ ] `arcade-card.tsx`: export `ArcadeCardShell({ tier, front }: { tier: CardTier; front: ReactNode })` with the current markup; `ArcadeCard` uses it.
- [ ] `arcade-hud.tsx`: export `ArcadeSlots({ items, filled }: { items: readonly { key: string; tier: CardTier; mini: ReactNode }[]; filled: readonly boolean[] })`; `ArcadeHand` maps pulls onto it. Add `--slot-count` on `.ar-hand`; CSS shrinks slots when count > 6 so 9 slots fit a 375 px viewport.
- [ ] No visual or audible change for the booster.

**Acceptance:** web typecheck, lint, build pass; `grep -n "playSound" apps/web/src/features/boosters/arcade` returns only the default in `director.ts`. Booster checked manually in T12.

**Commit:** `refactor(web): make the arcade stage reusable with an injected sound sink`

## Task 7 — Web data layer (spec §4.2, §4.3, §4.6) — parallel with T5, T6

**Files (create, all in `apps/web/src/features/whats-new/`):** `whats-new.api.ts`, `whats-new.queries.ts`, `use-whats-new.ts`, `use-news-targets.ts`, `release-dates.ts`, `news-session.ts`

**Steps**
- [ ] API: `fetchWhatsNew()`, `markWhatsNewSeen(releaseId)`, `fetchWhatsNewTargets(leagueId)` with `apiRequest` + shared schemas.
- [ ] Queries: `whatsNewQueryOptions` (`['whats-new']`, `staleTime` 5 min), `whatsNewTargetsQueryOptions(leagueId)` (`['whats-new', 'targets', leagueId]`, `staleTime` 1 min).
- [ ] `useWhatsNew()` → `{ knownUnseen: ReleaseNote[]; hasUnseen: boolean; releases: ReleaseNote[]; isUnseen(id): boolean; markSeen(releaseId): void }`: filters server ids by `RELEASE_NOTES` (D3); `markSeen` is a mutation with optimistic `setQueryData` (removes that id and every older one), on error logs via `logger` and invalidates.
- [ ] `useNewsTargets(leagueId, isEnabled)` → `{ hrefFor(target) }` returning the TanStack `Link` props (`to`, `params`, `search`) or null when hidden (spec §4.4 table).
- [ ] `release-dates.ts`: `formatReleaseDay(publishedAt)` → "9 nov." (fr-FR, `Europe/Paris`), `formatReleaseLabel` → "Mise à jour · 9 nov.".
- [ ] `news-session.ts`: module-level `wasAutoShown()` / `markAutoShown()` flag (spec §4.6).

**Acceptance:** web typecheck + lint pass; no game rule here (targets come from the server).

**Commit:** `feat(web): add what's new data hooks`

## Task 8 — News stage: pack, cards, swipe (spec §4.5 steps 1-4) — after T5, T6, T7

**Files (create):** `apps/web/src/features/whats-new/use-news-opening.ts`, `news-sound.ts`, `components/news-stage.tsx`, `components/news-card-face.tsx`, `components/news-illustrations.tsx`, `apps/web/src/styles/whats-new.css`

**Steps**
- [ ] `news-sound.ts`: `newsSoundSink: SoundSink` mapping `burst → newsTear`, `flip | flipLight → newsFlip`, dropping everything else.
- [ ] `use-news-opening.ts`: reducer `pack → opening → deck → shown → recap` (plus `focus` index for recap re-open), Director created with `newsSoundSink`; first tap → `burstPack`; then reveal each card with `revealLong` (aura visuals) on first show, `revealQuick` when re-shown; `stash` on advance; swipe handling via pointer events (≥ 40 px horizontal, left next, right previous); announcements per spec §4.5; reduced motion respected via the Director flag. Expose `{ state, onTap, onSwipeStart/Move/End, next, previous, openRecapCard, closeRecapCard, hint }`.
- [ ] `news-illustrations.tsx`: `NewsIllustration({ name })` for camera, stacks, showcase, share, sort, more — CSS/inline SVG with design-system tokens, loops ≤ 4 s, frozen under reduced motion, `aria-hidden`.
- [ ] `news-card-face.tsx`: `NewsCardFace({ card, size })` = `CardFace` (`isProvisional={false}`, tier from card) with the illustration as art; "Et aussi…" variant (Commune, illustration `more`).
- [ ] `news-stage.tsx`: `NewsStage({ leagueId, pack, mode: 'auto' | 'replay', onClose(reason: 'skip' | 'done' | 'try') })` rendered in a portal as a modal layer (`useModalLayer`), arcade markup (`ar-stage`, `ar-scaler`, `ar-world`, `ar-tint`, `ar-rays`, `ArcadePack` with `subtitle={formatReleaseLabel(...)}` and `isChargeHidden`, `ArcadeCardShell` per card, canvas, flash, `ArcadeSlots`, `ar-stamp`), eyebrow "Nouveautés", "N nouveautés · aucune carte à gagner", "Passer" ghost button always visible (Escape = Passer), body text + "Essayer" (from `useNewsTargets`) under the stage in `shown`.
- [ ] Imports the arcade CSS files and `whats-new.css`.

**Acceptance:** web typecheck, lint, build pass; component files import no `*.api`/`lib/http`; no `aura`/`stamp`/`slam`/`packTap` sound can reach `playSound` from this stage (sink unit-checked by reading).

**Commit:** `feat(web): add the what's new booster stage`

## Task 9 — Recap (spec §4.5 step 5) — after T8 (same folder)

**Files:** create `apps/web/src/features/whats-new/components/news-recap.tsx`; modify `news-stage.tsx`, `use-news-opening.ts`, `whats-new.css`

**Steps**
- [ ] Grid of small `NewsCardFace`s, `ease-pop` 70 ms stagger, title "Tu es à jour" (auto) or the release date (replay), sub "N nouveautés depuis ta dernière visite" (auto) / "N nouveautés" (replay).
- [ ] Tap a card → big view with body + Essayer + "Retour" (plays `newsFlip`).
- [ ] Primary "C'est parti" plays `confirm` (via `playSound({ name: 'confirm' })`) and calls `onClose('done')`.

**Acceptance:** web typecheck, lint, build pass.

**Commit:** `feat(web): add the what's new recap`

## Task 10 — Auto-show gate + nav dot (spec §4.6, §4.7) — after T9

**Files:** create `apps/web/src/features/whats-new/components/whats-new-gate.tsx`; modify `apps/web/src/routes/_authed/l.$leagueId.tsx`, `apps/web/src/components/ui/bottom-nav.tsx`

**Steps**
- [ ] `WhatsNewGate({ leagueId, isSuspended })`: opens when `hasUnseen`, not `wasAutoShown()`, not suspended; builds the pack with `buildNewsPack(knownUnseen, { maxCards: 8 })` + "Et aussi…" when overflow; on close (any reason) `markAutoShown()` and `markSeen(pack.newestId)`; "try" closes then navigates.
- [ ] League layout: suspended on the booster stage and `/l/$leagueId/add`; `PasskeyPrompt` not rendered while the gate is open (lift an `isOpen` state via callback).
- [ ] `BottomNav`: `hasProfileBadge?: boolean` → green dot (`bg-tier-uncommon`, `size-2`, ring `bg-nav`) on the Profil icon + accessible name "Profil, nouveautés à voir".

**Acceptance:** web typecheck, lint, build pass.

**Commit:** `feat(web): show the what's new booster after an update`

## Task 11 — Profil › Quoi de neuf (spec §4.7) — after T10 (shares profile/layout files)

**Files:** create `apps/web/src/routes/_authed/l.$leagueId.profile.nouveautes.tsx`, `apps/web/src/features/whats-new/components/news-pack-list.tsx`; modify `apps/web/src/routes/_authed/l.$leagueId.profile.index.tsx`, `apps/web/src/components/ui/settings-list.tsx` (`hasDot?: boolean` on `SettingsRowContent`, with sr-only "nouveau"), `apps/web/src/routeTree.gen.ts` (regenerated)

**Steps**
- [ ] Profil: group "Storix" with row "Quoi de neuf" (icon `star`, value = newest release day, dot when unseen) linking to `/l/$leagueId/profile/nouveautes`.
- [ ] Sub-page with `ProfileSubPage` title "Quoi de neuf": `NewsPackList` rows (mini pack art, "N nouveautés", titles joined by " · " truncated, "Nouveau" green chip when unseen). Tap → `NewsStage` `mode="replay"` with that release only; on close `markSeen(release.id)` (monotonic server-side).
- [ ] Regenerate the route tree: `pnpm --filter @storix/web exec vite build` then `pnpm --filter @storix/web build`.

**Acceptance:** web typecheck, lint, build pass; route tree contains the new route.

**Commit:** `feat(web): add the Quoi de neuf release list in Profil`

## Task 12 — Verification (orchestrator + check agents)

- [ ] Apply the migration locally through the normal flow (`pnpm db:migrate` with the real local env, done by the orchestrator only), restart `storix/api`, `storix/web` via Portly.
- [ ] API smoke: `GET /api/whats-new` for an old user → `["2026-11-09"]`; for a user created now → `[]`; `POST /seen` with `2026-11-09` → `[]`; with an older/unknown id (`1999-01-01`) → 400; second device sees `[]`; targets for a member with no cards → both null.
- [ ] Chrome E2E (375 px and desktop, full and reduced motion): auto-show on app open; tear on one tap; 5 cards with auras, swipe left/right, tap; Essayer hidden for an empty collection and shown with cards/stacks, navigates to the right screen; Passer at every phase; Escape; recap re-open; C'est parti; reload → nothing shown; Profil dot + nav dot before, gone after; Quoi de neuf list and replay; no sound with interface sounds off even with booster sounds on, and the reverse; passkey prompt not stacked on top.
- [ ] Regression: open a real booster; same visuals and sounds (packTap, slam, aura, stamp, flip, burst) as before; 9-slot hand fits at 375 px (temporarily via a local 9-card pack in the replay).
- [ ] Context-free check agent on the full diff: scope adherence, layering, no inline comments, English code, French copy.
