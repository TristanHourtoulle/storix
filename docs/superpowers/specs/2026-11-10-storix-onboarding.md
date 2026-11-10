# Storix — "Premiers pas" onboarding stories — Design

Date: 2026-11-10 · Status: approved direction (proposal C, tap-only) · Plan: `docs/superpowers/plans/2026-11-10-storix-onboarding.md`

## 1. Goal

A brand-new account sees, once, a full-screen story sequence "Storix · Premiers pas" that explains the game in six screens: the goal, rarity, adding a photo, boosters, the collection, and installing the app on the phone. The member moves at their own pace by tapping. Nothing advances on its own. They can close it at any time and replay it from Profil.

Accounts that existed before this release never see it automatically.

## 2. Frozen user decisions (2026-11-10)

1. Proposal C "Les stories plein écran" from the artifact https://claude.ai/artifact/PHG7ygGrVBVNQ5mYjzcCD8 (source `premiers-pas.html`, section `#c`). The UI must match the artifact (bars, top row, visual, text block, tap zones, backgrounds), per the standing "match the artifact exactly" rule.
2. **Change vs the artifact:** no auto-advance and no hold-to-pause. A tap on the right two-thirds goes to the next story, a tap on the left third goes back. Progress bars only show the position.
3. Shown once per account, after signup / first login. Existing accounts are marked seen by the migration.
4. The seen flag lives on the server and syncs across devices. It follows the `whats_new_reads` pattern.
5. Always skippable.
6. New members never get both onboarding and "Nouveautés".
7. Replay from Profil.
8. Sounds come from the "Nouveautés" set (interface category). No new voice.
9. No bonus booster.
10. Install story:
    - It detects the platform and shows "déjà installée" when the app runs standalone.
    - It handles in-app browsers (Messenger, Instagram, …) with a "Copier le lien" button and steps to open the link in Safari or Chrome.
    - Android install through `beforeinstallprompt` is new work.
11. Booster copy reads the league's actual settings, not the defaults.

## 3. Audit (real code, file:line)

### Existing patterns to mirror

- **Seen-state pattern:** `packages/db/src/schema/whats-new-reads.ts` defines one row per user, with PK `user_id → user.id ON DELETE CASCADE`. Migration `packages/db/drizzle/0012_whats_new_reads.sql` (latest migration on main). Related API pieces:
  - `apps/api/src/features/whats-new/whats-new.service.ts`: `runInTransaction`, plus an advisory lock `lockUserWhatsNew` in the repository.
  - `whats-new.routes.ts`: `authenticate` plus `perUserRateLimit`, the same as `features/me/me.routes.ts:8-25`.
- **"Nouveautés" for new members is already handled.** `unseenReleaseIds` falls back to `memberSince = user.createdAt` when the user has no read row (spec `2026-11-10-storix-whats-new-design.md` §4.2 D1). An account created after the latest release has nothing unseen. **Decision 6 is therefore already satisfied with no signup write.** The only remaining case is a release published after signup. The gate ordering (§4.6) covers it.

### Web layout and existing prompts

- **League layout:** `apps/web/src/routes/_authed/l.$leagueId.tsx:33-79`.
  - It mounts `WhatsNewGate` (suspended on `/booster` and `/add`), `PasskeyPrompt` (hidden while news is open or pending), and `IosInstallHint` above `BottomNav`.
  - `wasAutoShown` is a module-level session flag (`features/whats-new/news-session.ts`).
- **iOS install banner:** `features/pwa/use-ios-install-hint.ts` and `components/ios-install-hint.tsx`.
  - It shows only in iOS Safari when not standalone and not dismissed (`STORAGE_KEYS.iosHintDismissed`).
  - Its copy is "Installe Storix : touche Partager puis « Sur l'écran d'accueil »".
- **Platform helpers:** `apps/web/src/lib/platform.ts`.
  - `isIos` already treats an iPad with a desktop UA as iOS (`MacIntel` + touch).
  - `isIosSafari` excludes `CriOS|FxiOS|EdgiOS|OPiOS`, but in-app browsers (FBAN, Instagram) still pass because their UA contains `Safari`.
  - `isStandalone` is defined there.
  - Nothing handles `beforeinstallprompt`.
- **Push:**
  - `features/push/use-push-notifications.ts:50` returns `status`, `isReady`, and enable/disable actions.
  - `push-browser.ts:19` has `isPushSupported`.
  - On iOS, push only works in the installed app.
- **League facts visible to a member:** `packages/shared/src/schemas/wallet.ts` exposes `booster.maxStock`, `booster.intervalSeconds`, `pity.epicGuaranteeIn` and `pool.nextEligibleAt`.
  - It does **not** expose `joinGift` or `newCardDelayMinutes`. Both are resolved in `apps/api/src/features/wallets/wallets.service.ts:23-32` via `resolveLeagueSettings`.
  - Defaults: `intervalMinutes 240`, `maxStock 6`, `joinGift 2` (`schemas/league-settings.ts`), `PITY_EPIC_AFTER = 10` (`domain/pity.ts`).

### Profil, sounds, signup and tests

- **Profil:** `routes/_authed/l.$leagueId.profile.index.tsx:134-150`. The group "Storix" holds the "Quoi de neuf" row (`SettingsRowContent`, `icon="star"`).
- **Sounds:** `features/sound/sound-types.ts:17-61` has `newsTear`, `newsFlip` and `confirm`, all in the `interface` category.
- **Signup:** new accounts come from `routes/join.$token.tsx` (invitation) or the CLI bootstrap. Both land in a league layout.
- **Tests:** the web app has no test runner. Pure tested code lives in `packages/shared/src/domain/*` (vitest).

## 4. Design

### 4.1 Seen state (DB)

Table `onboarding_reads`:

| Column | Type |
|---|---|
| `user_id` | `text`, PK → `user.id`, `ON DELETE CASCADE` |
| `seen_at` | `timestamptz`, `NOT NULL` |
| `updated_at` | `timestamptz`, `NOT NULL`, `default now()` |

- Schema file: `packages/db/src/schema/onboarding-reads.ts`, re-exported from `schema/index.ts`.
- Migration: generated by `db:generate`. A backfill statement is appended to the generated SQL, after a `--> statement-breakpoint`:

  ```sql
  INSERT INTO "onboarding_reads" ("user_id", "seen_at") SELECT "id", now() FROM "user" ON CONFLICT DO NOTHING;
  ```

  Every account that exists when the migration runs is marked seen (decision 3). The migration runs at deploy, so an account created after it is "new" by construction.

### 4.2 API

Feature folder `apps/api/src/features/onboarding/` (`onboarding.routes.ts`, `onboarding.service.ts`, `onboarding.repository.ts`), wired in `deps.ts` and `app.ts` like `whats-new`. Schemas live in `packages/shared/src/schemas/onboarding.ts`.

| Route | Guards | Behaviour |
|---|---|---|
| `GET /api/onboarding` | `authenticate` | `200 { isSeen: boolean }` |
| `POST /api/onboarding/seen` | `authenticate`, `perUserRateLimit`, origin check like every mutation | No body. Upsert `ON CONFLICT DO NOTHING` (the first `seen_at` wins). `200 { isSeen: true }`. Idempotent; no lock needed. |

The wallet contract also gains two fields, so the booster story can use real numbers (decision 11):

- `walletStateSchema.booster.joinGift: z.int().min(0)`
- `walletStateSchema.pool.newCardDelayMinutes: z.int().min(0)`

Both are filled in `wallets.service.ts` from the already-resolved settings. A new endpoint would duplicate the settings resolution.

### 4.3 Pure install-context helper (shared, tested)

`packages/shared/src/domain/install-context.ts`:

```ts
type InstallContext =
  | 'installed'        // display-mode standalone / navigator.standalone
  | 'in-app'           // social-app webview: cannot install, must open in a real browser
  | 'ios-safari'       // Share > Sur l'écran d'accueil
  | 'ios-other'        // CriOS / FxiOS / EdgiOS (iOS ≥ 16.4 can add via their share menu)
  | 'android-prompt'   // beforeinstallprompt captured: native "Installer" button
  | 'android-manual'   // Android browser without a captured prompt: menu ⋮ > Installer l'application
  | 'desktop'          // anything else
interface InstallEnv { userAgent: string; isStandalone: boolean; isIpadDesktop: boolean; hasInstallPrompt: boolean }
function installContextOf(env: InstallEnv): InstallContext
function inAppBrowserOf(userAgent: string): InAppBrowser | null // 'messenger' | 'facebook' | 'instagram' | 'whatsapp' | 'snapchat' | 'tiktok' | 'linkedin' | 'line'
function chromeIntentUrl(url: string): string // intent://host/path#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=<encoded url>;end
```

The order is: installed, then in-app, then iOS, then Android, then desktop. In-app detection uses these UA tokens:

| App | UA tokens |
|---|---|
| Messenger | `FBAN/MessengerForiOS`, `FB_IAB/MESSENGER`, `Orca-Android` |
| Facebook | `FBAN`, `FBAV`, `FB_IAB` |
| Instagram | `Instagram` |
| WhatsApp | `WhatsApp` |
| Snapchat | `Snapchat` |
| TikTok | `musical_ly`, `BytedanceWebview`, `TikTok` |
| LinkedIn | `LinkedInApp` |
| Line | `Line/` |

The named app is used in the copy ("Tu es dans Messenger"). Unknown webviews such as `SFSafariViewController` cannot be detected and fall into `ios-safari` / `android-manual`, which is acceptable.

`apps/web/src/lib/platform.ts` gains `readInstallEnv(hasInstallPrompt)`. It builds `InstallEnv` from `navigator`/`window`, and `isIosSafari` is reimplemented on top of the helper so it also excludes in-app browsers. That fixes the iOS banner showing inside Instagram.

### 4.4 Android install prompt (web)

`apps/web/src/features/pwa/install-prompt.ts` is a module-level store. Its `startInstallPromptCapture()` is called once in `main.tsx` before render, because the event can fire before React mounts.

- It listens to `beforeinstallprompt`: `preventDefault`, then stores the event.
- It listens to `appinstalled` and clears the event.
- It exposes `useInstallPrompt(): { canPrompt: boolean; prompt: () => Promise<'accepted' | 'dismissed' | 'unavailable'> }` through `useSyncExternalStore`.

There is no Android banner. The prompt is only offered inside the install story. The existing iOS banner stays for every member who skipped installing; see the gate rules in §4.6.

### 4.5 The stories (UI)

- **Overlay and modal layer:** a full-screen overlay `OnboardingStories` mounted by the gate above the league layout, on the `color-board` ground. It is a modal layer (`useModalLayer`: focus trap, `aria-modal`, label "Premiers pas") and adds a small `styles/onboarding.css`.
- **Markup:** mirrors the artifact `.story`:
  1. `.bg` radial background per story;
  2. `.bars` with one segment per story: `done` and `cur` are filled, `cur` gets a short `width` transition, and there is no `fill` keyframe;
  3. `.top` with "Storix · Premiers pas" on the left and a ✕ button (`aria-label="Passer"`) on the right;
  4. `.visual`;
  5. `.txt` with an `h` title (Space Grotesk 25px) and a `p` (ink-2, 14px);
  6. `.tapzones`, a `1fr 2fr` grid of two transparent buttons labelled "Story précédente" / "Story suivante", starting below the top row (`inset: 40px 0 0`).

  Interactive elements inside a story (CTA, install buttons, copy link) sit above the tap zones (`z-index` 4), as in the artifact.
- **Navigation:**
  - The right zone, `→` and `Space` go next. The left zone and `←` go back. `Escape` = Passer.
  - Next on the last story does nothing; the CTA is the exit.
  - Back on the first story does nothing.
  - Each move plays `newsFlip`. The final CTA plays `confirm`.
  - Story 1 shows a small hint line "Touche à droite pour continuer" under the text. This is the one deviation from the artifact, and it is needed because nothing advances on its own. It disappears after the first move.
- **Accessibility and motion:**
  - A live region announces "Story 2 sur 6 : La ligue décide de la rareté".
  - Visuals are `aria-hidden`.
  - Under reduced motion, background and bar transitions are instant.

Stories (copy in French, tutoiement, sentence case, ✦ the only glyph). Visuals are those of the artifact `STORIES` array.

| # | Background tint | Visual | Title | Text |
|---|---|---|---|---|
| 1 | legendary (amber) | fan of 3 cards (common / rare / legendary rims) | Tes photos deviennent des cartes | Chaque photo du groupe se collectionne. Ouvre des boosters pour les gagner. |
| 2 | epic (violet) | 3 numbered rows: Un membre qui poste peu · Une photo ancienne · Des réactions du groupe | La ligue décide de la rareté | Top 5 % = Légendaire. *Mythique line from the rarity copy module, §4.7* |
| 3 | uncommon (green) | the bottom nav with the centred + | Le + au centre | Viseur ou galerie, un cadrage, un titre. Ta carte entre dans les boosters `{newCardDelay}` plus tard. |
| 4 | rare (blue) | sealed STORIX pack (scale .8) | `{joinGift}` offerts, puis 1 toutes les `{interval}` | `{maxStock}` en stock max. Épique garantie au `{PITY_EPIC_AFTER}`e booster sans Épique. |
| 5 | cyan | "+400 ✦" big number | Tes doublons s'empilent | À ×10, ta copie peut monter d'une rareté. Ou convertis tes doublons en paillettes. |
| 6 | violet | install steps for the detected context (§4.5.1) | Installe Storix | context text (§4.5.1) |

About story 5: the artifact text "Doublons = paillettes / Convertis tes doublons et améliore la rareté de tes cartes" no longer matches the code. Duplicates now stack (×N) and are converted manually (`promotion.ts`, `PROMOTION_COPIES = 10`). The title and text are corrected to the real rule; the visual is unchanged.

Durations are formatted by a pure helper `formatDurationFr(minutes)`: "1 heure", "4 h", "30 min", "1 h 30". "Offerts" agrees with `joinGift` ("1 offert", "2 offerts"). When `joinGift` is 0, the title becomes "1 booster toutes les `{interval}`".

The last story's primary button "Ajouter ma première photo" (artifact) plays `confirm`, marks seen, closes, and navigates to `/l/$leagueId/add`. A ghost text button "Plus tard" next to it closes and marks seen. ✕ also marks seen.

#### 4.5.1 Install story by context

All lists use the artifact's `.osgrid` / `.osrow` numbered rows.

- **installed:** one row "✓ Storix est déjà sur ton écran d'accueil". Text: "Tu es dans l'app, rien à faire." If `isPushSupported()` and the push status is `disabled`, a secondary button "Activer les notifications" calls the existing push enable action. Text addition: "On te prévient quand ton stock de boosters est plein."
- **ios-safari:** the artifact's 3 rows: Ouvre Storix dans Safari / Touche Partager / « Sur l'écran d'accueil ». Text: "Storix s'ouvrira comme une vraie app, en plein écran." Push is not offered: it needs the installed app on iOS.
- **ios-other:** rows: Touche Partager dans la barre d'adresse / « Sur l'écran d'accueil » / Si tu ne le vois pas, ouvre le lien dans Safari. Button "Copier le lien".
- **android-prompt:** a primary button "Installer Storix" calls `prompt()`. Text: "Storix s'ajoute à ton écran d'accueil comme une app." On `accepted`, the story switches to the installed state.
- **android-manual:** rows: Ouvre le menu ⋮ de Chrome / « Installer l'application » ou « Ajouter à l'écran d'accueil ».
- **in-app:**
  - Title "Ouvre Storix dans ton navigateur".
  - Text "Tu es dans `{Messenger}` : impossible d'installer Storix d'ici. Copie le lien et colle-le dans Safari (iPhone) ou Chrome (Android). Tu devras te reconnecter une fois."
  - Rows (iOS): Touche ⋯ ou le bouton du navigateur / « Ouvrir dans le navigateur » / Sinon, colle le lien dans Safari.
  - Rows (Android): same, with Chrome.
  - Buttons:
    - "Copier le lien" copies `window.location.origin + '/'`. It uses `navigator.clipboard.writeText` and falls back to a selected read-only input. Confirmation "Lien copié ✓" stays for 2 s.
    - On Android only, "Ouvrir dans Chrome" (`chromeIntentUrl`).
  - The re-login warning is required, because the session cookie lives in the webview's jar, not in the real browser.
- **desktop:** rows: Ouvre ce lien sur ton téléphone / Ajoute Storix à ton écran d'accueil. Button "Copier le lien".

### 4.6 Gate and ordering

`OnboardingGate` lives in `features/onboarding/components/onboarding-gate.tsx`, mounted in the league layout before `WhatsNewGate`.

- It opens when `GET /api/onboarding` resolved with `isSeen: false`, the route is not `/booster` nor `/add`, and it was not already shown this app session.
- The session flag is `features/onboarding/onboarding-session.ts`, a copy of the `news-session` pattern, so a failed POST never loops.
- Closing marks it seen optimistically: the query data is set to `{ isSeen: true }`, then POST. On error, it logs via the logger and invalidates, but stays closed this session.
- **Ordering:** while onboarding is pending (`isSeen === false` and not yet shown) or open, the layout:
  - suspends `WhatsNewGate`, with `isSuspended` extended;
  - hides `PasskeyPrompt`;
  - hides `IosInstallHint`.

  After it closes, the next prompt may appear on the next navigation, as today. This gives one modal at a time.

### 4.7 Copy module

`apps/web/src/features/onboarding/onboarding-stories.ts` builds the six stories from `WalletState` + the install context. It is pure data: title, text, visual key, tint and CTA.

- Numbers come from the wallet (`joinGift`, `intervalSeconds`, `maxStock`, `newCardDelayMinutes`) and from shared constants (`PITY_EPIC_AFTER`, the legendary percentile from `rarity-tiers.ts`).
- While the wallet loads, the gate waits, so it does not open on partial data. If the wallet query errors, story 4 falls back to shared defaults (`resolveLeagueSettings({})`).
- The mythic line in story 2 is one constant in this module. Today it is "La Mythique est choisie par un admin, 3 max."; the premium booster spec changes mythic to a computed tier. Whichever branch merges second updates this one line.

### 4.8 Profil › Premiers pas (replay)

- A new row in the Profil group "Storix", above "Quoi de neuf": icon `stack` (an existing glyph: `star` is used by "Quoi de neuf", and `sparkles` / `info` do not exist in `components/ui/icon.tsx`). Label "Premiers pas", hint "Revoir le tutoriel", chevron.
- Tapping opens `OnboardingStories` as an overlay on the Profil screen (state in the route component, no new route), in replay mode:
  - same stories, final CTA included;
  - no API call (already seen), no session flag.

## 5. Decisions taken in this design

- **D1 Separate table** `onboarding_reads`, not a column on Better Auth `user`. This mirrors `whats_new_reads` and keeps auth tables untouched.
- **D2 Backfill in the migration** rather than a `createdAt` cutoff constant. It is exactly "existing accounts marked seen", with no magic date in code.
- **D3 Boolean seen**, no content version. Re-onboarding on a future content change is YAGNI; a `version` column can be added then.
- **D4 No signup hook for "Nouveautés"**: already covered by the `memberSince` fallback (§3). A release published after signup waits until onboarding is closed (§4.6).
- **D5 Per account, not per league**: joining a second league does not replay it.
- **D6 Wallet carries `joinGift` and `newCardDelayMinutes`**, instead of a new facts endpoint: the settings are already resolved there.
- **D7 Install-context detection in `@storix/shared`**: it is a pure UA parser and the only place with a test runner. It also fixes the iOS banner showing inside in-app browsers.
- **D8 No separate notifications story.** Push is offered on the install story only when it can work: installed app, or Android/desktop with push support and status disabled. This avoids a dead-end step on iOS Safari.
- **D9 Story 5 copy corrected** to stacking (×10 upgrade) because the artifact text describes the old auto-dust rule.
- **D10 One-time hint on story 1** ("Touche à droite pour continuer"), the only visual deviation, required by tap-only navigation.
- **D11 Final CTA "Ajouter ma première photo"** deep-links to `/add`. "Plus tard" and ✕ just close. All three mark seen.
- **D12 Android "Ouvrir dans Chrome"** (intent URL) is shown only for in-app browsers on Android. iOS has no reliable equivalent, so copy-paste only.

## 6. Out of scope

- Checklist or coach marks (proposals B and D).
- Bonus booster.
- Analytics.
- An Android install banner outside the stories.
- Translating copy.
- Re-onboarding existing accounts.

## 7. Risks

- **Migration numbering:** the premium-booster branch also adds a migration (likely `0013`) and touches `walletStateSchema` (pity gauge). Whichever merges second must regenerate its migration on top of main (`db:generate` again; never hand-rename the file and journal) and resolve the wallet schema conflict.
- **`beforeinstallprompt` timing:** capture must start in `main.tsx` before render, or the event is lost on first load. Verify in Android Chrome, or Chrome desktop with DevTools > Application > Manifest.
- **UA sniffing is best effort:** in-app browsers change their UA. Unknown webviews degrade to the normal iOS/Android instructions, which is harmless.
- **Cookie isolation in in-app browsers:** the user must log in again in Safari/Chrome. The copy says so. The invitation link may already be consumed; the copied link is the app root, not the invitation.
- **The iOS banner now hides in in-app browsers**, because `isIosSafari` uses the new helper. Intended, but it is a behaviour change for existing members.
