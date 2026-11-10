# Storix — "Nouveautés" booster (what's new) — Design

Date: 2026-11-10 · Status: approved direction (option D everywhere) · Plan: `docs/superpowers/plans/2026-11-10-storix-whats-new.md`

## 1. Goal

When a member opens Storix after an update that added features, a sealed booster "Mise à jour · 9 nov." appears. They tap it, it tears open, and each new feature flips out as a card with its rarity aura. They swipe or tap through the cards, then see a booster-style recap of all of them. Nothing is won: the pack only explains what changed. The same booster can be replayed from Profil › Quoi de neuf, where every release is listed as its own pack.

Features only. Bug fixes never get a card.

## 2. Frozen user decisions (2026-11-10)

1. Option D, "Le booster des nouveautés", for the auto-show and for Profil › Quoi de neuf. Proposal C's dialog layout is not used anywhere.
2. Auto-show the first time a member opens the app with unseen releases.
3. Several unseen releases make ONE merged pack: newest first, at most 8 feature cards, then an "Et aussi…" card listing the titles of the older ones.
4. Profil › Quoi de neuf = list of packs, one per release, newest first; tapping one replays its opening.
5. A green dot on the "Quoi de neuf" row and on the Profil tab while a release is unseen.
6. An "Essayer" deep-link button per card, hidden when its target would be empty.
7. Sounds reuse existing voices only: burst (tear), flipLight (next), confirm (done), all under the **interface** sound category. Never aura, stamp, slam or packTap.
8. Release notes live in a versioned file in the repo. The server stores, per user, the last release seen (synced across devices). "Passer", "C'est parti" and "Essayer" mark it seen.
9. Delivery: merge and deploy autonomously after review and browser E2E.

## 3. Audit (real code, file:line)

- API layering, enforced by `eslint.config.js:100-208`: `*.routes.ts` HTTP only, `*.service.ts` use cases (type imports from `@storix/db` only), `*.repository.ts` Drizzle only. Feature folders in `apps/api/src/features/*`, wired in `apps/api/src/deps.ts` and registered in `apps/api/src/app.ts:83-101` under the `/api` prefix.
- Route pattern: user-scoped `GET /api/me` (`features/me/me.routes.ts:8-25`, `authenticate` preHandler, Zod response schema); league-scoped `GET /leagues/:leagueId/wallet` with `requireLeagueRole('member')` and `request.membership` (`features/wallets/wallets.routes.ts:8-17`); per-user rate limit via `perUserRateLimit` (`features/push/push.routes.ts:14-18`).
- ORM: Drizzle 0.45 + drizzle-kit 0.31. Schema files in `packages/db/src/schema/*.ts`, re-exported by `schema/index.ts:1-16`. Migrations are generated SQL in `packages/db/drizzle/` (last: `0011_duplicate_stacks.sql`), applied by `apps/api/src/cli/migrate.ts`. `drizzle.config.ts` requires `DATABASE_URL` even for `generate` (no connection is made).
- User model: Better Auth table `user` (`packages/db/src/schema/auth.ts:14-30`), with `createdAt`. Users are created only by `auth.gateway.ts:83` `signUpEmail` (invitation join and CLI bootstrap). User-owned tables cascade on user delete (`push-subscriptions.ts:8-10`).
- First open: `/_authed` `beforeLoad` ensures `meQueryOptions` (`apps/web/src/routes/_authed.tsx:5-9`); every app screen sits in the league layout `routes/_authed/l.$leagueId.tsx`, which mounts the per-league hooks, `PasskeyPrompt`, and the `BottomNav` (hidden on the booster stage, line 42).
- Booster opening: `features/boosters/use-arcade-opening.ts` (reducer phases `pack → opening → deck → revealing → shown → summary`), `arcade/director.ts` (WAAPI + particles, `collectLayers` reads `.ar-world`, `.ar-tint`, `.ar-rays`, `.ar-flash`, `.ar-stamp`, `.ar-slot`, `.ar-card`, `.ar-pack-*`, `.ar-pips`, `.ar-pip`, `.ar-cracks g`, `.ar-shard`), `arcade/pack-choreography.ts` (`hitPack`, `burstPack`), `arcade/choreography.ts` (`revealLong`, `revealQuick`, `stash`, `layoutDeck`), `arcade/tiers.ts` (tier colours/particles), components `arcade-pack.tsx` (pack art with "N cartes" sub-label), `arcade-card.tsx` (shell + `PulledFace`, bound to `BoosterPull`), `arcade-hud.tsx` (`ArcadeHand` slots bound to pulls), `booster-stage.tsx`.
- The choreography calls the global `playSound` directly: `choreography.ts:44,118,171,221,247` (stamp, aura, flip) and `pack-choreography.ts:21,70,111,126,132` (packTap, slam, burst). Reusing it as is would play forbidden sounds.
- Sound: `features/sound/sound-types.ts:1-60`. The category is fixed per sound name in `SOUND_CATEGORY`; `burst` and `flipLight` are `booster`, `confirm` is `interface`. `playSound` checks the category (`sound.ts:58`). Voices are rendered in `library.ts:111-165` (`flipLight` = `booster.flip(v, 0.45)`).
- Cards: `features/cards/components/card-face.tsx` (`CardFace` with `size`, `tier`, `children` art, optional `band`), tier labels in `features/cards/tier-labels.ts`.
- Profil: `routes/_authed/l.$leagueId.profile.index.tsx` with `SettingsGroup` / `SettingsRowContent` (`components/ui/settings-list.tsx`); sub-pages `l.$leagueId.profile.<slug>.tsx` using `features/profile/components/profile-sub-page.tsx`.
- Nav: `components/ui/bottom-nav.tsx:58-66` (Profil link, no badge support yet).
- Deep-link targets: `/l/$leagueId/add` (camera, `validateSearch { resume }`), `/l/$leagueId/collection` (`validateSearch { sort: collectionSortSchema }`, values `rarity | discovery | number`, `packages/shared/src/domain/collection-cursor.ts:3`), `/l/$leagueId/cards/$cardId` (vitrine, share sheet lives there).
- Web layering: components and routes may not import `*.api`, `lib/http` (`eslint.config.js:230-245`); data in hooks; API calls in `features/<x>/<x>.api.ts` via `apiRequest` + Zod schema (`features/push/push.api.ts`).
- Shared: `packages/shared/src/domain` is pure (imports only `./*`), unit tested with vitest; `schemas` hold Zod contracts. Shared may not import React, db, fastify.
- Modal layering helper: `components/crop/use-modal-layer.ts` (focus trap, layer stack).

## 4. Design

### 4.1 Release notes catalog (repo file, single source)

`packages/shared/src/release-notes/catalog.ts` exports `RELEASE_NOTES`, newest first:

```ts
interface ReleaseNoteCard {
  key: string                 // stable, unique within the release, kebab-case
  title: string               // French, sentence case, ≤ 32 chars
  body: string                // French, tutoiement, ≤ 180 chars
  tier: CardTier              // drives frame, aura and recap colour
  illustration: NewsIllustration // 'camera' | 'stacks' | 'showcase' | 'share' | 'sort'
  tryTarget: NewsTryTarget    // 'add' | 'collection-discovery' | 'showcase-card' | 'stack-card' | 'none'
}
interface ReleaseNote {
  id: string                  // 'YYYY-MM-DD' (suffix '-b' for a second one the same day)
  publishedAt: string         // ISO datetime with offset, when the features went live
  cards: readonly ReleaseNoteCard[] // 1..8
}
```

The catalog is Zod-validated by a unit test (`releaseNoteSchema`), which also checks: ids unique, sorted by `publishedAt` descending, card keys unique per release, 1 to 8 cards per release. Both the API (ids, dates) and the web app (content) import it, so they cannot drift within one build.

First release `2026-11-09`, published `2026-11-09T18:00:00+01:00`:

| # | key | Tier | Title | Body | Essayer |
|---|-----|------|-------|------|---------|
| 1 | camera | Légendaire | Un « + » tout neuf | Le bouton + ouvre directement l'appareil photo, avec un viseur au format carte. Cadre, déclenche, c'est prêt. | add |
| 2 | stacks | Épique | Tes doublons s'empilent | Tes doublons ne partent plus en paillettes : ils s'empilent sur la carte. À ×10, ta copie peut monter d'une rareté, rien que pour toi. | stack-card |
| 3 | showcase | Rare | Tes cartes, en grand | Chaque carte a sa vitrine, en plein écran avec sa progression. Après un booster, la loupe te montre chaque tirage de près. | showcase-card |
| 4 | share | Mythique | Partage en 3 styles | Carte, Flex ou Booster : crée une image prête à envoyer, avec le vrai logo Storix. | showcase-card |
| 5 | sort | Peu commune | Trie ta collection | Par rareté, découverte ou numéro, et repère d'un coup d'œil les cartes ✦ NEW. | collection-discovery |

Copy follows the design system: tutoiement, sentence case, ✦ the only glyph, no emoji.

### 4.2 Seen state and unseen computation

Table `whats_new_reads`: `user_id text PK → user.id ON DELETE CASCADE`, `release_id text NOT NULL`, `seen_at timestamptz NOT NULL`, `updated_at timestamptz NOT NULL default now()`. One row per user. A separate table keeps the Better Auth `user` table untouched.

Pure domain `packages/shared/src/domain/whats-new.ts`:

- `unseenReleaseIds(releases, { seenReleaseId, seenAt, memberSince })`:
  - seen id found in the catalog → every release listed before it (newer);
  - seen id not in the catalog (release removed) → releases with `publishedAt > seenAt`;
  - no row → releases with `publishedAt > memberSince` (user `createdAt`).
- `isNewerRelease(releases, candidateId, currentId)` → true when the candidate is newer than the current one (or current is null/unknown).
- `buildNewsPack(releases, { maxCards: 8 })` → `{ newestId, newestPublishedAt, cards, overflowTitles }`: concatenates the cards newest first, keeps the first 8, the titles of the rest go to `overflowTitles`.

**New members** (decision D1): no row is written at signup. A member created after a release never sees it, because the fallback compares with `memberSince`. They discovered the app with these features, so a backlog would be noise. No signup hook, no backfill, and existing members (created 2026-11-07/08) do see release 2026-11-09.

**Monotonic marking** (D2): `markSeen(releaseId)` only moves forward. The service locks the row (`SELECT … FOR UPDATE` in a transaction, then upsert), compares with `isNewerRelease`, and ignores an older id. Two devices or a replay of an older pack can never "un-see" a newer release. An id not in the server catalog → 400 `UNKNOWN_RELEASE`.

**Stale clients** (D3): the server and the PWA bundle may briefly run different catalogs. The client only shows releases it knows (filters `unseenReleaseIds` by its own catalog) and marks seen with the newest id it showed. A newer release stays unseen on the server and appears after the service worker update.

### 4.3 API contract

All responses Zod-validated, schemas in `packages/shared/src/schemas/whats-new.ts`.

- `GET /api/whats-new` (authenticate) → `200 WhatsNewState`
  `{ seenReleaseId: string | null, unseenReleaseIds: string[] }` (newest first).
- `POST /api/whats-new/seen` (authenticate, per-user + per-IP rate limit, origin check as every mutation) body `{ releaseId: string }` → `200 WhatsNewState`. Idempotent, monotonic.
- `GET /api/leagues/:leagueId/whats-new/targets` (authenticate, `requireLeagueRole('member')`) → `200 WhatsNewTargets`
  `{ showcaseCardId: uuid | null, stackCardId: uuid | null }`:
  - `showcaseCardId`: the member's highest-tier owned copy among active (non-hidden) cards of the league, newest copy first on ties; null when they own none.
  - `stackCardId`: an active card of the league where the member has a stack entry (`card_copy_stacks.count > 0`), highest count first; null when none.

The feature lives in `apps/api/src/features/whats-new/` (`whats-new.routes.ts`, `whats-new.service.ts`, `whats-new.repository.ts`). `findMemberSince(db, userId)` is added to `features/users/users.repository.ts`.

### 4.4 Essayer targets (client mapping, no game rule)

| tryTarget | Link | Hidden when |
|-----------|------|-------------|
| add | `/l/$leagueId/add` | never |
| collection-discovery | `/l/$leagueId/collection?sort=discovery` | `showcaseCardId` is null (empty collection) |
| showcase-card | `/l/$leagueId/cards/$showcaseCardId` | `showcaseCardId` is null |
| stack-card | `/l/$leagueId/cards/$stackCardId` | `stackCardId` is null |
| none | — | always |

While targets are loading or failed, Essayer is hidden. "Essayer" marks seen, closes the booster, then navigates.

### 4.5 The booster experience (option D)

A full-screen overlay (`NewsStage`) above the league layout, on the `color-board` ground, using the real arcade stage markup and CSS so it looks exactly like a booster.

1. **Sealed pack.** The arcade pack art with the sub-label "Mise à jour · 9 nov." (newest release date, fr-FR short month) instead of "N cartes". The charge pips are hidden. Eyebrow above: "Nouveautés"; line below: "N nouveautés · aucune carte à gagner". Hint: "Touche pour ouvrir". "Passer" (ghost, top-right) is visible from the first frame to the recap.
2. **Tear.** One tap tears it (decision D4: the 3-tap charge is a gameplay beat; here it would only slow reading). Same cracks, shards and particles (`burstPack`), sound `newsTear` (burst voice, interface category), haptic like the booster burst.
3. **Cards.** The deck forms; each card flips out with its tier aura and particles (`revealLong` visuals, aura sound muted). Large `CardFace` front: the animated illustration as the art, the title in the band, the tier line in its colour. Under the stage: the body text and, if available, "Essayer". Advance with a tap on the stage or a horizontal swipe (≥ 40 px, left = next, right = previous card, already-revealed cards re-show without the aura charge). Each advance plays `newsFlip` (flipLight voice, interface category). Full-motion reveal ≤ 1.6 s per card; reduced motion uses the existing reduced choreography.
4. **"Et aussi…"** card (only when `overflowTitles` is not empty): Commune tier, illustration "more", band "Et aussi…", body = the older titles joined with " · ", no Essayer.
5. **Recap.** Booster-style grid of all cards (small `CardFace`s, `ease-pop` 70 ms stagger), title "Tu es à jour", sub "N nouveautés depuis ta dernière visite" (or the release date when replaying). Tapping a card re-opens it big (same face, flipLight) with its body and Essayer, back to the recap with "Retour". Primary button "C'est parti" plays `confirm`, marks seen, closes.

Accessibility: overlay is a modal layer (`useModalLayer`: focus trap, `aria-modal`, labelled "Nouveautés"), Escape = Passer, live region announces "Nouveauté 2 sur 5 : Tes doublons s'empilent, Épique." like the booster. Every illustration is decorative (`aria-hidden`); the text carries the meaning.

Illustrations (`news-illustrations.tsx`, CSS-only/inline SVG, design-system tokens, loops ≤ 4 s, frozen under reduced motion): camera (viewfinder brackets closing on a mini card + shutter flash), stacks (three cards dropping onto a pile, ×3 badge), showcase (a card growing to full frame with a glare sweep), share (a card splitting into three tiles), sort (a 3×2 grid reordering, one ✦ NEW badge popping), more (stacked lines).

### 4.6 Auto-show gate

`WhatsNewGate` mounted in the league layout:

- Opens when `GET /api/whats-new` resolved, the known unseen list is not empty, the current route is not the booster stage nor `/add` (camera live), and it was not already dismissed in this app session (module-level flag, so a failed mark-seen never loops).
- While open, `PasskeyPrompt` is not rendered (one modal at a time); it may appear after closing.
- Content = `buildNewsPack` of the known unseen releases. Close by Passer / C'est parti / Essayer → mark seen with the newest shown id (optimistic: the state query is updated to `unseenReleaseIds: []` before the request; on error, log via logger, invalidate, and keep closed for this session).

### 4.7 Profil › Quoi de neuf

- New row in Profil, group "Storix" (below "Cet appareil"): icon `star` (existing glyph; `dust` stays reserved for paillettes), label "Quoi de neuf", value = newest release date ("9 nov."), green dot (`color-tier-uncommon`, with sr-only text "nouveau") while an unseen known release exists.
- Profil tab in `BottomNav`: same green dot, accessible name "Profil, nouveautés à voir".
- Route `/l/$leagueId/profile/nouveautes` (`ProfileSubPage`, title "Quoi de neuf"): one row per known release, newest first. Each row shows a mini sealed pack (pack art scaled down, date sub-label), "N nouveautés", the card titles joined by " · " (truncated), and a "Nouveau" chip (green, with the word) when unseen. Tapping opens `NewsStage` with that release only (no merge, no "Et aussi…"). Closing it marks that release seen if it is newer than the stored one (monotonic).

### 4.8 Sound

Two new request names in `sound-types.ts`, both category `interface`:

- `newsTear` → rendered by `booster.burst(v)`, haptic `[30, 40, 60]`;
- `newsFlip` → rendered by `booster.flip(v, 0.45)` (the `flipLight` voice).

`confirm` is reused as is. The arcade `Director` gains an injected sound sink: the choreography calls `d.sound(request, delay)` instead of the global `playSound`. The booster passes `playSound` (behaviour unchanged). The news stage passes a sink that maps `burst → newsTear`, `flip | flipLight → newsFlip`, and drops everything else (`packTap`, `slam`, `aura`, `stamp`, `coin`, `revealAll`, `summary`, `pity`).

### 4.9 Reuse of booster code

- `Director`: optional sound sink (constructor parameter, default `playSound`).
- `ArcadePack`: `subtitle` prop (default "N cartes" label computed by the booster) and `isChargeHidden` (pips rendered for `collectLayers` but visually hidden).
- `ArcadeCard`: split into a generic `ArcadeCardShell({ tier, front })` and the booster's `ArcadeCard({ pull })` built on it.
- `ArcadeHand`: generic `ArcadeSlots({ items: { key, tier, mini }[], filled })`, used by the booster hand and the news deck.
- Arcade CSS reused (`booster-stage.css`, `booster-card.css`, `booster-pack.css`), plus `styles/whats-new.css` for the overlay, illustrations and recap. With up to 9 cards, slots shrink when `n > 6` (CSS variable on `.ar-hand`) so the hand fits a 375 px viewport.

## 5. Decisions taken in this design (rationale)

- **D1 New members get no backlog**: fallback on `user.createdAt`, no signup write. Simplest correct rule, no hook in Better Auth.
- **D2 Monotonic seen pointer**, not a set of seen ids: releases are ordered, "everything up to X" is all we need; replays and multi-device races are harmless.
- **D3 Client filters by its own catalog**: avoids showing an empty or broken card for a release the bundle does not know.
- **D4 One tap to tear** instead of three: informational, not gameplay.
- **D5 Targets endpoint per league**, fetched only when the stage opens: keeps `/me` lean, and "hidden when empty" stays a server fact, not a client game rule.
- **D6 Separate table** `whats_new_reads` rather than a column on Better Auth's `user`.
- **D7 Overlay, not a route**, for the auto-show and replays: it must sit above whatever screen the member opened, and it should not pollute history. The profile list is a normal sub-route.
- **D8 Max 8 cards per release** enforced by the catalog test, so a single-release replay never needs "Et aussi…".
- **D9 Sounds via new names** (`newsTear`, `newsFlip`) instead of a category override argument: the category stays a property of the sound name, matching the current model.

## 6. Out of scope

Admin-authored release notes, per-league content, push notifications for releases, analytics on what was viewed, translations.

## 7. Risks

- Refactoring the arcade `Director` sound calls touches the live booster: the booster must sound and behave exactly as before (manual E2E of a real opening).
- 9 cards in the hand on a 375 px viewport: check slot sizing.
- Stale PWA bundle vs server catalog: covered by D3, verify by marking seen with an id unknown to the server (400) and by a client that knows fewer releases.
