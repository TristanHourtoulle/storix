# Storix — "Premiers pas" onboarding stories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax.
>
> **Commits:** each task ends with a commit step that runs ONLY when the orchestrator says so. Without that go-ahead, stop at the step and report.

**Goal:** new accounts see, once, six full-screen "Premiers pas" stories (tap-only, no auto-advance) covering:
- the goal;
- rarity;
- adding a photo;
- boosters (real league numbers);
- the collection;
- installing the app, with platform and in-app-browser handling.

They can replay the stories from Profil. Existing accounts are marked seen by the migration.

**Architecture:**
- One `onboarding_reads` row per user (server-side seen flag, mirrors `whats_new_reads`).
- `GET /api/onboarding` and `POST /api/onboarding/seen`.
- Two extra wallet fields (`joinGift`, `newCardDelayMinutes`).
- A pure, tested install-context helper in `@storix/shared`.
- A module-level `beforeinstallprompt` store.
- A web overlay that copies the artifact's `.story` markup, opened by a gate that takes priority over "Nouveautés", the passkey prompt and the iOS banner.

**Spec:** `docs/superpowers/specs/2026-11-10-storix-onboarding.md`. Read it fully before any task; § numbers refer to it.

**Artifact:** https://claude.ai/artifact/PHG7ygGrVBVNQ5mYjzcCD8, source `/private/tmp/claude-501/-Users-tristanhourtoulle--paradev-sessions-victorious-hamster-f823c5be/ff466f9b-8cfa-4957-a0b3-c205181e635e/scratchpad/onboarding/premiers-pas.html`. Use section `#c`, CSS block `/* stories (C) */` and the `STORIES` array. If the scratchpad is gone, read the artifact with the Artifact tool. Diff your markup and CSS against it, and never swap in a different-looking primitive.

**Design system:** https://claude.ai/artifact/PnujcYudoKxB6yCvdwWchz (`project/README.md`).

**Branch / worktree:** `feat/onboarding-stories`, off `origin/main`, in its own worktree.

## Global constraints

- **Toolchain:** Node 24 (`source ~/.nvm/nvm.sh && nvm use 24`). No new dependency.
- **TypeScript:** strict, `noUncheckedIndexedAccess`, no `any`, immutable data, Zod at every boundary.
- **Comments and language:**
  - No comments except basic JSDoc on exported functions.
  - English code, logs and commits.
  - French UI copy: tutoiement, sentence case, ✦ is the only glyph, no emoji.
- **Layering** exactly as `eslint.config.js`:
  - `routes`: HTTP only.
  - `services`: use cases.
  - `repositories`: Drizzle only.
  - `packages/shared/src/domain`: pure.
  - Web components and routes: presentational; data lives in hooks.
- **Tests:** ONLY `packages/shared/src/domain/install-context.test.ts`, with at most 8 cases. No other test file, no CI.
- **Off limits:** never boot or stop servers outside Portly. Never touch Docker, `.env`, `db:push` or seeds.
- **Migration:** generate with `DATABASE_URL=postgres://x@localhost/x pnpm db:generate`.
- **Verify** from the worktree root: `pnpm typecheck && pnpm lint && pnpm test`. Web tasks also run `pnpm --filter @storix/web build`.
- If a real name differs from this plan, keep the behaviour, use the real name and report it.

## Parallelization map

| Group | Tasks | Parallel? | Shared files (serialize) |
|-------|-------|-----------|--------------------------|
| G1 contracts | T1, T2 | yes, in parallel (disjoint files) | both add one export line to `packages/shared/src/{domain,schemas}/index.ts`, so merge carefully |
| G2 server | T3 → T4 | after T1; T3 then T4 | `apps/api/src/deps.ts`, `app.ts` |
| G3 web foundations | T5, T6 | after G1; parallel with G2 and with each other | T5: `lib/platform.ts`, `features/pwa/*`, `main.tsx` · T6: `features/onboarding/onboarding.api.ts`, `*.queries.ts`, `use-onboarding.ts`, `onboarding-session.ts` |
| G4 web UI | T7 → T8 → T9 | after T5 and T6 | T7/T8: `features/onboarding/components/*`, `styles/onboarding.css` · T9: `l.$leagueId.tsx`, profile index |
| G5 verify | T10 | last | — |

## Task 1 — Shared schemas + wallet fields (spec §4.2)

**Files**
- Create `packages/shared/src/schemas/onboarding.ts`.
- Modify `packages/shared/src/schemas/index.ts` and `packages/shared/src/schemas/wallet.ts`.
- Modify `apps/api/src/features/wallets/wallets.service.ts` (and its repository only if settings are not already at hand).

**Steps**
- [ ] `onboardingStateSchema = z.object({ isSeen: z.boolean() })`, plus type `OnboardingState`.
- [ ] `walletStateSchema`: add `booster.joinGift: z.int().min(0)` and `pool.newCardDelayMinutes: z.int().min(0)`.
- [ ] `wallets.service.ts:23-32`: fill both fields from the resolved `settings` (`settings.booster.joinGift`, `settings.newCardDelayMinutes`).
- [ ] Fix any web compile error from the new required fields (fixtures or mocks only; there should be none).
- [ ] Verify, then commit `feat(shared): add onboarding state and wallet league facts`.

**Acceptance:** `GET /leagues/:id/wallet` returns both fields with the league's values, and typecheck passes.

## Task 2 — Pure install-context helper + tests (spec §4.3) — parallel with T1

**Files**
- Create `packages/shared/src/domain/install-context.ts` and `install-context.test.ts`.
- Modify `packages/shared/src/domain/index.ts`.

**Steps**
- [ ] Export the types `InstallContext`, `InAppBrowser` and `InstallEnv`.
- [ ] Export the functions `inAppBrowserOf(userAgent)`, `installContextOf(env)` and `chromeIntentUrl(url)`, exactly as in spec §4.3.
- [ ] Check in this order: installed → in-app → iOS (UA `iPad|iPhone|iPod` or `isIpadDesktop`; `CriOS|FxiOS|EdgiOS|OPiOS` → `ios-other`, else `ios-safari`) → Android (`hasInstallPrompt` → `android-prompt`, else `android-manual`) → `desktop`.
- [ ] Order the in-app detection so Messenger wins over Facebook: messenger (`MessengerForiOS`, `FB_IAB/MESSENGER`, `Orca-Android`), facebook (`FBAN`, `FBAV`, `FB_IAB`), instagram, whatsapp, snapchat, tiktok (`musical_ly`, `BytedanceWebview`, `TikTok`), linkedin (`LinkedInApp`), line (`Line/`).
- [ ] `chromeIntentUrl('https://h/p?q')` returns `intent://h/p?q#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=https%3A%2F%2Fh%2Fp%3Fq;end`.
- [ ] Write up to 8 tests, with real UA strings:
  - standalone wins over everything;
  - iOS Messenger is `in-app`/`messenger`;
  - Android Instagram is `in-app`/`instagram`;
  - iOS Safari;
  - iOS Chrome is `ios-other`;
  - iPad desktop UA is `ios-safari`;
  - Android Chrome with prompt and without;
  - the `chromeIntentUrl` encoding.
- [ ] Verify, then commit `feat(shared): add install context detection`.

**Acceptance:** `pnpm --filter @storix/shared test` passes, and the helper imports nothing outside `./*`.

## Task 3 — DB table + migration with backfill (spec §4.1) — after T1

**Files**
- Create `packages/db/src/schema/onboarding-reads.ts`.
- Modify `packages/db/src/schema/index.ts`.
- Generated: `packages/db/drizzle/00NN_onboarding_reads.sql` plus meta.

**Steps**
- [ ] Define `onboardingReads = pgTable('onboarding_reads', { userId: text('user_id').primaryKey().references(() => user.id, { onDelete: 'cascade' }), seenAt: timestamp('seen_at', { withTimezone: true }).notNull(), updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow() })`, copying `whats-new-reads.ts`.
- [ ] Run `pnpm db:generate` with the dummy URL, and use the next free number at that moment. If the premium booster migration has landed on main, rebase first so the numbers don't collide.
- [ ] Append to the generated SQL: `--> statement-breakpoint` then `INSERT INTO "onboarding_reads" ("user_id", "seen_at") SELECT "id", now() FROM "user" ON CONFLICT DO NOTHING;`.
- [ ] Verify, then commit `feat(db): add onboarding reads with backfill of existing accounts`.

**Acceptance:** the SQL holds CREATE TABLE + FK + INSERT, and the drizzle journal and snapshot are consistent (re-running `db:generate` produces "No schema changes").

## Task 4 — API feature (spec §4.2) — after T3

**Files**
- Create `apps/api/src/features/onboarding/onboarding.{routes,service,repository}.ts`.
- Modify `apps/api/src/deps.ts`, `apps/api/src/app.ts`, and `apps/api/src/http/rate-limit.ts` (add an `onboardingSeen` limit next to `whatsNewSeen`).

**Steps**
- [ ] Repository:
  - `isOnboardingSeen(db, userId): Promise<boolean>`;
  - `markOnboardingSeen(db, { userId, now })`: insert … `onConflictDoNothing()`.
- [ ] Service: `createOnboardingService({ db, clock })` with `getState(session)` and `markSeen(session)`, both returning `OnboardingState`.
- [ ] Routes:
  - `GET /onboarding`: `authenticate`.
  - `POST /onboarding/seen`: `[authenticate, perUserRateLimit]` with IP limit `config`, the same as `whats-new.routes.ts`.
  - Both use the Zod response schema.
- [ ] Register in `app.ts` under `/api`, next to `whatsNewRoutes`.
- [ ] Verify, then commit `feat(api): add onboarding seen state`.

**Acceptance:**
- typecheck and lint pass;
- with the local stack (Portly `storix/api` already running, do not start it), `GET /api/onboarding` returns `{ isSeen: true }` for an existing seeded user after the migration;
- POST is idempotent.

## Task 5 — Platform + Android install prompt (spec §4.3, §4.4) — after T2, parallel with T3/T4/T6

**Files**
- Modify `apps/web/src/lib/platform.ts` and `apps/web/src/main.tsx`.
- Create `apps/web/src/features/pwa/install-prompt.ts`.

**Steps**
- [ ] `platform.ts`:
  - add `readInstallEnv(hasInstallPrompt: boolean): InstallEnv`;
  - reimplement `isIosSafari()` as `installContextOf(readInstallEnv(false)) === 'ios-safari'`;
  - keep `isIos` and `isStandalone`.
- [ ] `install-prompt.ts`, a module store:
  - `startInstallPromptCapture()` adds listeners exactly once: `beforeinstallprompt` (`preventDefault`, then store) and `appinstalled` (clear);
  - `useInstallPrompt()` via `useSyncExternalStore` returns `{ canPrompt, prompt }`;
  - `prompt` resolves `'accepted' | 'dismissed' | 'unavailable'` and clears the stored event after use;
  - type the event locally (`interface BeforeInstallPromptEvent extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }`), no `any`.
- [ ] `main.tsx`: call `startInstallPromptCapture()` before `createRoot(...).render`.
- [ ] Verify, build, then commit `feat(web): capture the Android install prompt`.

**Acceptance:** the iOS banner still shows in iOS Safari but not in Instagram or Messenger (check with a UA override in DevTools), and the build passes.

## Task 6 — Web data layer (spec §4.6) — after T1, parallel with T4/T5

**Files**
- Create `apps/web/src/features/onboarding/onboarding.api.ts`, `onboarding.queries.ts`, `use-onboarding.ts` and `onboarding-session.ts`.

**Steps**
- [ ] `onboarding.api.ts`: `fetchOnboarding()` and `markOnboardingSeen()` via `apiRequest`, Zod-parsed, the same as `whats-new.api.ts`.
- [ ] `onboarding.queries.ts`: `onboardingQueryOptions` (key `['onboarding']`, `staleTime: Infinity`).
- [ ] `use-onboarding.ts`: returns `{ isPending, isSeen, markSeen }`.
  - `markSeen` is optimistic: `setQueryData({ isSeen: true })`, then the mutation.
  - On error it calls `logger.error`, then invalidates.
- [ ] `onboarding-session.ts`: `wasOnboardingShown(userId)` / `markOnboardingShown(userId)`, copied from `news-session.ts`.
- [ ] Verify, then commit `feat(web): add onboarding data hooks`.

## Task 7 — Stories overlay: shell, navigation, stories 1-5 (spec §4.5, §4.7) — after T5, T6

**Files**
- Create `apps/web/src/features/onboarding/onboarding-stories.ts` (pure copy builder), `format-duration.ts`, `components/onboarding-stories.tsx`, `components/story-visuals.tsx` and `apps/web/src/styles/onboarding.css`.
- Import the CSS from `onboarding-stories.tsx` (`import '@/styles/onboarding.css'`), the same way `news-stage.tsx:14` imports `whats-new.css`.

**Steps**
- [ ] `format-duration.ts`: `formatDurationFr(minutes)` returns `"30 min" | "1 heure" | "4 h" | "1 h 30"`.
- [ ] `onboarding-stories.ts`: `buildOnboardingStories({ wallet, installContext, inAppBrowser, platformFamily })` returns 6 `Story` objects `{ key, tint, visual, title, text, cta? }`.
  - Copy follows spec §4.5 exactly: `joinGift` agreement, `joinGift === 0` variant, `PITY_EPIC_AFTER`, the legendary percentile from shared, and `MYTHIC_LINE` as one constant.
  - Wallet absent: fall back to `resolveLeagueSettings({})` values.
- [ ] `onboarding.css`: port the artifact's `/* stories (C) */` rules (`.story`, `.bg`, `.bars`, `.top`, `.visual`, `.txt`, `.tapzones`, `.fan`, `.osgrid`, `.osrow`) under an `.ob-` prefix, with design-system tokens.
  - Remove the `fill` keyframe and `.paused`.
  - `cur` and `done` are both `width: 100%`, with a 200 ms width transition that is instant under `prefers-reduced-motion`.
  - The overlay is fixed, `inset: 0`, `z-index` above the bottom nav, with safe-area padding.
- [ ] `onboarding-stories.tsx` `OnboardingStories({ leagueId, mode: 'auto' | 'replay', onClose(reason: 'skip' | 'later' | 'photo') })`:
  - uses `useModalLayer` (label "Premiers pas");
  - index state;
  - tap zones `1fr 2fr` with labels "Story précédente" / "Story suivante";
  - keys `←` / `→` / `Space` / `Escape`;
  - `newsFlip` on each move;
  - live region "Story N sur 6 : {title}";
  - story 1 hint "Touche à droite pour continuer" until the first move;
  - ✕ `aria-label="Passer"`.
- [ ] `story-visuals.tsx`: fan, rarity rows, nav-with-plus, sealed pack and "+400 ✦", copied from the artifact `STORIES[].v`. For the nav and pack, reuse the real `BottomNav` look only if it renders identically to the artifact; otherwise port the artifact markup.
- [ ] Verify, build, then commit `feat(web): add onboarding stories overlay`.

**Acceptance:** side by side with the artifact at 375×812, bars, top row, type sizes, backgrounds and tap zones match. Nothing auto-advances, and back and next clamp at both ends.

## Task 8 — Install story (spec §4.5.1) — after T7 (same folder)

**Files**
- Create `apps/web/src/features/onboarding/components/install-story.tsx` and `use-copy-link.ts`.
- Modify `onboarding-stories.tsx` and `onboarding-stories.ts`.

**Steps**
- [ ] Render one variant per context: `installed` / `ios-safari` / `ios-other` / `android-prompt` / `android-manual` / `in-app` (iOS or Android rows) / `desktop`. Use spec §4.5.1 copy verbatim and `.ob-osgrid` rows.
- [ ] `use-copy-link.ts`:
  - `navigator.clipboard.writeText(origin + '/')`, falling back to a selected read-only input;
  - `copied` state for 2 s, shown as "Lien copié ✓".
- [ ] `android-prompt`: "Installer Storix" calls `prompt()`. On `accepted`, re-render as `installed`.
- [ ] In-app on Android: "Ouvrir dans Chrome" is an `<a href={chromeIntentUrl(origin + '/')}>`.
- [ ] `installed` (or Android/desktop with push supported and status `disabled`): "Activer les notifications" uses the existing `usePushNotifications` enable action. Hide it on iOS when not installed.
- [ ] Last-story CTAs:
  - "Ajouter ma première photo": `confirm` sound, then `onClose('photo')`;
  - "Plus tard": `onClose('later')`.
- [ ] Verify, build, then commit `feat(web): add install story with in-app browser handling`.

**Acceptance:** each context renders correctly under DevTools UA overrides (Messenger iOS, Instagram Android, iOS Safari, iOS Chrome, Android Chrome, desktop) and in display-mode standalone (DevTools emulation).

## Task 9 — Gate, ordering and Profil replay (spec §4.6, §4.8) — after T8

**Files**
- Create `apps/web/src/features/onboarding/components/onboarding-gate.tsx`.
- Modify `apps/web/src/routes/_authed/l.$leagueId.tsx` and `apps/web/src/routes/_authed/l.$leagueId.profile.index.tsx`.

**Steps**
- [ ] `OnboardingGate({ leagueId, userId, isSuspended, onOpenChange })`, following the `WhatsNewGate` structure:
  - it opens when the query resolved with `isSeen === false`, `!isSuspended`, `!wasOnboardingShown(userId)` and the wallet query is settled;
  - on close it calls `markSeen()`, and on `'photo'` it navigates to `/l/$leagueId/add`.
- [ ] League layout:
  - mount `OnboardingGate` before `WhatsNewGate`;
  - `isOnboardingPending = isSeen === false && !wasOnboardingShown(userId)`;
  - while `isOnboardingOpen || isOnboardingPending`: `WhatsNewGate.isSuspended = true`, and hide `PasskeyPrompt` and `IosInstallHint`.
- [ ] Profil, group "Storix", above "Quoi de neuf": add the row "Premiers pas" (icon `stack`, hint "Revoir le tutoriel", chevron).
  - Tapping it opens `OnboardingStories mode="replay"` from local state.
  - Closing it makes no API call. `'photo'` still navigates to `/add`.
- [ ] Verify, build, then commit `feat(web): show onboarding to new accounts and replay from Profil`.

**Acceptance:**
- a fresh account sees the stories once, then never again (also after reload and on a second device);
- no "Nouveautés", passkey or iOS banner shows on top;
- an existing account never sees them automatically.

## Task 10 — Verification (orchestrator + check agents)

- [ ] Run a context-free review of the full diff: layering, no comments, English, French copy matches the spec, no `any`, artifact parity.
- [ ] Run the migration locally through the normal flow. Check that `onboarding_reads` has a row per existing user and that a newly created account has none.
- [ ] Browser E2E (Chrome, 375×812):
  1. Create an account via invitation: the stories appear and tap-only navigation works.
  2. Check story 4 numbers against a league with non-default settings (e.g. interval 60, max 3, gift 1).
  3. Check each install context through UA overrides.
  4. "Copier le lien" puts the URL on the clipboard.
  5. ✕ closes and marks seen; reload, and it doesn't reappear.
  6. Replay from Profil works.
  7. An old account sees nothing.
  8. Reduced motion is respected.
- [ ] Run the existing booster opening once: no regression from the layout gate changes.
