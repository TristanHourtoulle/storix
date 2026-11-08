# Storix

Storix is a private, invite-only, mobile-first PWA. Friends share photos inside leagues, every photo becomes a collectible card, and members open boosters to collect the cards of their league.

Live at **https://storix.tristanhourtoulle.fr**. See the [design spec](docs/superpowers/specs/2026-11-07-storix-design.md) and the [roadmap](docs/superpowers/plans/2026-11-07-storix-roadmap.md).

## Features

### Accounts and leagues

- Invite-only: an account is created by redeeming an invitation link (or by the bootstrap CLI for the first user). Invitations are created by admins.
- No email anywhere. Better Auth still requires an address, so a synthetic internal one (`users.storix.invalid`) is generated per user.
- Username (case-insensitive) and password, with a passkey offered after the first login.
- Roles per league: owner, admin, member. Admins change roles, remove members and invite. The owner can transfer ownership to an admin (the previous owner becomes admin).
- Each user has a home league: the first league they joined, fixed at signup.
- Forgotten password: only the owner of the member's home league can generate a single-use reset code (valid 24 h, stored hashed, audited, invalidates every session of the member). The code is accepted regardless of case, spaces, a missing dash, or `O`/`I`/`L` typed for `0`/`1`. Leaving the home league ends reset-code eligibility, and the leave dialog warns about it.

### Photos and cards

- Upload from the phone as a swipeable stack of cards. Each photo is prepared on the device (EXIF capture date, resize, GPS stripped) and uploaded in the background as soon as it is picked: presigned POST straight to the bucket, then a completion without a title. The worker checks duplicates and renders the media, and the upload stays a private draft (`staged`) for 48 h that only its author sees. Title, tagged members and an optional crop at the card ratio (63:88) are autosaved on the draft; "Publier" turns the whole stack into cards in stack order, and the worker applies the crop when it creates each card. Leaving keeps the sent photos as a draft that can be resumed from the collection. A daily quota per member applies (`uploadQuotaPerDay`, default 10) and counts drafts; admins and owners are unlimited, with 30 photos per stack.
- The worker strips EXIF and GPS, produces AVIF and WebP variants (256, 768, 1600), a thumbhash and a dominant color, rejects duplicates, creates the card and deletes the original.
- Card detail: rarity, foil, author, capture date, discoverer, copies and reactions, with a holo tilt.

### Game

- **Rarity engine** per league: uploader scarcity, photo age and reactions, weighted by the league's `rarityWeights`, mapped to six tiers with percentile quotas and hysteresis, and fixed thresholds for small leagues (cold start). Admin pins and min/max bounds take precedence. Mythic is capped at 3 cards per league.
- **Boosters**: one booster every `intervalMinutes` (default 240) up to `maxStock` (default 6), plus `joinGift` boosters (default 2) for a new member. Five slots, foil odds 1/15. A card enters the booster pool 1 hour after its creation (`newCardDelayMinutes`, default 60).
- **Arcade opening**: new cards get the long aura and flip; duplicates and upgrades are shown flat. Reduced motion is supported.
- **Pity**: Epic or better guaranteed on the 10th booster without one; from the 26th booster without a Legendary, +1 % Legendary per booster.
- **Collection**: owned cards with their mint tier; cards you do not own are locked silhouettes (`???`) with no title and no image in the API response. Filters by member and rarity.
- **Dust economy**: duplicates turn into dust, a copy can be recycled for its value, and a normal copy can be upgraded to foil. Crafting a missing card is disabled for now (route not registered; the domain and service code is kept).
- **Reactions**: `fire`, `heart`, `star`, on cards you own and did not author. They feed the next rarity run.
- **Discovered by**: the first member to pull a card is frozen as its discoverer.

### Administration

- League settings (Réglages): rarity weights with a live tier preview, booster cadence, stock and join gift, upload quota, new-card delay. Every save triggers a rarity recompute.
- Card moderation (Cartes tab): hide and unhide, pin a tier, set min/max bounds, validate the capture date, delete. Every action is audited and recorded in the tier history.

### Privacy

- **Hidden cards** leave boosters. Their owners see a blurred `Masquée` silhouette with no title and no image. Hiding is reversible and gives no compensation.
- **Withdrawal**: a tagged member (or the author) can withdraw a card from "Photos où tu apparais".
- **Card removal** (admin delete, withdrawal, departure with delete, account deletion): owners of a copy are compensated in dust from the copy's mint tier and variant, the bucket objects are deleted, and a tombstone lets every device purge the card.
- **Leaving and removal**: the departing member (or the admin removing them) chooses to keep or delete their photos. Kept cards show "Photo de {pseudo} · ancien membre"; authorship comes back on rejoin. Copies and wallet of the departing member are dropped without compensation.
- **Account deletion** from the profile: re-authentication by password (or a passkey sign-in less than 5 minutes old) and the username typed as confirmation. It is blocked while the user owns a league with other members. Leagues where the user is alone are deleted. In other leagues the user chooses keep (cards signed "Ancien membre") or delete.
- **Client purge**: each device syncs the league's removed cards on focus (`/removed-cards`, 60 s stale time). It deletes their images from the media cache by prefix, drops the league entries of the offline API cache and shows a `+N paillettes` notice. A 403 or 404 on the league purges every cached entry of it. Logout, a session change, leaving and account deletion purge too.

## Architecture

```
apps/web         React 19, Vite, TanStack Router and Query, Tailwind v4, Serwist (PWA)
apps/api         Fastify 5, Better Auth, Zod type provider, pino; serves the built web app in production
apps/worker      pg-boss consumer: image pipeline (sharp), upload sweep, rarity recompute, storage deletes and GC
packages/shared  Zod schemas and the pure domain (roles, invitations, reset codes, rarity, boosters, pity, dust,
                 moderation, compensation, account deletion plan, storage GC rules)
packages/db      Drizzle schema, client, migrations, shared queries and advisory locks
packages/storage S3 gateway (presigned POST, object reads, writes, lists and deletes)
```

Request flow:

```
browser (PWA, service worker) -> api (Fastify, /api/* and /media/*, Railway CDN in front)
api -> Postgres (Drizzle)        api -> bucket (presigned POST for uploads, reads for /media)
api -> pg-boss (Postgres) -> worker -> Postgres + bucket
```

Layering rules, enforced by `no-restricted-imports` overrides in `eslint.config.js` (`pnpm lint` fails on a violation):

- Routes (`*.routes.ts`, `http/`) are HTTP only: no database, no repositories, no Better Auth (except `better-auth/node` in `auth.routes.ts`).
- Services (`*.service.ts`) are use cases: no SQL, no Fastify objects, no auth library, no route imports. Only type imports from `@storix/db`.
- Repositories (`*.repository.ts`) are Drizzle only: no rules, no HTTP, no services or routes.
- Worker jobs (`*.job.ts`) only wire pg-boss to services.
- `packages/shared` does not depend on the db, Fastify, React, Drizzle or Better Auth. `packages/shared/src/domain` is pure and imports only from itself (tests excepted).
- React components and routes are presentational: data access lives in hooks (they cannot import `*.api`, `lib/http` or `lib/auth-client`).

### Concurrency

- A per-league advisory **economy** lock is shared by every wallet transaction (boosters, recycle, foil, reactions) and exclusive for every removal (admin delete, withdrawal, departure, account deletion).
- Advisory locks are always taken in the order economy -> moderation -> rarity. Account deletion takes the economy locks of all its leagues in league id order, and locks the user's authored cards and then the user row last, right before the delete.
- Booster opening is one transaction and is idempotent per member and `requestId`.

### Data model

| Area     | Tables                                                                                                                                                                                                                                                                                                            |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth     | `user` (with `home_league_id`), `session`, `account`, `verification`, `passkey`                                                                                                                                                                                                                                   |
| Leagues  | `leagues` (with the `settings` JSON), `league_members` (role), `invitations`, `password_reset_codes`                                                                                                                                                                                                              |
| Photos   | `uploads` (`user_id` nullable, set null on account deletion; status `pending`, `uploaded`, `processing`, `staged`, `publishing`, `ready`, `rejected`, `failed` or `discarded`; `stage_only`, `crop`, `publish_requested_at`), `media` (variants, thumbhash, capture date, `crop` the variants were rendered with) |
| Cards    | `cards` (tier, tier source, status `active` or `hidden`, pins and bounds, author, discoverer), `card_tags`, `card_rarity_history`                                                                                                                                                                                 |
| Game     | `member_wallets`, `booster_openings` (seed, table version, pity, pool digest), `booster_pulls`, `card_copies` (`tier_at_mint`, variant), `reactions`                                                                                                                                                              |
| Removals | `card_removals` (tombstones with the media prefix, kept 35 days), `card_compensations`                                                                                                                                                                                                                            |
| Audit    | `audit_log`                                                                                                                                                                                                                                                                                                       |

Migrations live in `packages/db/drizzle` (`0000` to `0007`). The server never migrates on boot.

### Background jobs (worker)

| Job                | Trigger                                                                            | Work                                                                                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `media.process`    | upload completed                                                                   | duplicate check and image pipeline; a draft upload stops at `staged`, a legacy titled upload also creates its card and queues a rarity recompute                                       |
| `media.publish`    | "Publier", one job per draft in stack order                                        | renders the cropped 63:88 variants when a crop is set, creates the card, its number, tags and audit entry, then a rarity recompute                                                     |
| `media.sweep`      | every 15 minutes                                                                   | removes stranded uploads, drafts older than 48 h or whose author left, and discarded drafts; sends stuck publishes back to their job or to `staged`                                    |
| `rarity.recompute` | new card, settings change, moderation, nightly fan-out (one queued job per league) | recomputes tiers, writes the history, logs `Rarity recomputed`                                                                                                                         |
| `rarity.nightly`   | 03:00 Europe/Paris, and once at worker startup                                     | enqueues a recompute for every league                                                                                                                                                  |
| `storage.delete`   | after a card removal or account deletion commits                                   | deletes the bucket objects (refuses live keys)                                                                                                                                         |
| `storage.gc`       | Sundays 04:00 Europe/Paris (never at boot)                                         | deletes `img/` orphans older than 24 h and `incoming/` orphans older than 48 h, purges tombstones older than 35 days; a breaker skips the run when the orphans look like a mass delete |

At startup the worker waits until `drizzle.__drizzle_migrations` holds at least as many rows as the bundled migration journal (polls every 5 s, gives up after 3 minutes and exits non-zero so Railway restarts it). It never runs migrations itself.

### Storage and media URLs

- Upload: presigned POST with `content-length-range` (1 byte to 15 MB), exact `Content-Type` and a `Cache-Control` field enforced by an `eq` condition. Presigned PUT is never used.
- Object keys are content-hashed: `img/<league>/<sha256>/<size>.<format>`.
- Serving: `GET /media/{windowStart}/{hmac}/{objectKey}`. The HMAC-SHA256 covers the window and the key with `MEDIA_URL_SECRET`; windows are 24 h UTC and the current and previous ones are accepted (48 h at most). Successes are `public, max-age=<seconds until expiry>, immutable` with no cookie; errors (including a bad signature, `403`) are `no-store`.
- CDN: the Railway CDN in front of the api caches `/media/*` per URL (`x-cache: HIT` from the second GET).
- Service worker: media are cached under a key without the window and signature (`/media/img/...`, cache `storix-media-v1`), so a rotated URL still hits the cache. Card reads use NetworkFirst in `storix-api-v3`; every other `storix-api-*` cache is deleted on activation. `sw.js`, `index.html` and `manifest.webmanifest` are served `no-store`.

### Security

- Origin check: every unsafe `/api/*` request must carry an `Origin` equal to `APP_ORIGIN`.
- Rate limits (`@fastify/rate-limit`, per IP, per route): auth, invitations, reset codes, uploads, boosters, card actions, admin actions (settings, moderation, withdrawal, member role, removal, leave, transfer) and account deletion (5 per 15 minutes, also per user).
- Client IP: the Railway edge overwrites `X-Real-IP` and rebuilds `X-Forwarded-For`; Fastify trusts two proxy hops and Better Auth reads `X-Real-IP`. Do not expose the service without the Railway edge.
- Cookies: Better Auth session cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` with the `__Secure-` prefix in production. The cookie cache is disabled, so a deleted session is rejected at once.
- `/api/*` responses are `no-store`. Locked cards never carry a title or an image URL.

## Local setup

Prerequisites: Node 24 through nvm (`.nvmrc`), pnpm, Docker, and Portly (runs every persistent dev server; never start them by hand).

```bash
nvm use
pnpm install
cp .env.example .env
```

Fill `.env` (only `.env.example` is tracked):

| Variable                                                                                                   | Value                                                   |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `DATABASE_URL`                                                                                             | local Postgres on port 5440 (already in `.env.example`) |
| `BETTER_AUTH_SECRET`                                                                                       | `openssl rand -base64 48` (32 characters minimum)       |
| `MEDIA_URL_SECRET`                                                                                         | `openssl rand -base64 32`                               |
| `APP_ORIGIN`, `PASSKEY_RP_ID`                                                                              | `http://localhost:5180`, `localhost`                    |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE` | local MinIO (already in `.env.example`)                 |
| `LOG_LEVEL`, `MEDIA_CONCURRENCY`                                                                           | optional                                                |

Start PostgreSQL and MinIO with Docker Compose (the `minio-init` job creates the `storix-media` bucket), apply migrations and create the first user and league:

```bash
pnpm dev:db
pnpm db:migrate
BOOTSTRAP_PASSWORD='choose-a-password' pnpm --filter @storix/api bootstrap --username <name> --league <league name>
```

Start the dev servers with Portly and open http://localhost:5180:

```bash
portly status --json
portly start storix/api --json
portly start storix/web --json
portly start storix/worker --json
```

To test the game quickly, open the league's admin tab, Réglages, and set the booster interval to 1 minute and the new-card delay to 0.

There are no shared credentials in the repository: create your own account with the bootstrap CLI. Local MinIO uses the `bitnamilegacy/minio` images (see `AGENTS.md`).

### Production preview

Copy `.env` to `.env.preview` (gitignored) and set `NODE_ENV=production`, `PORT=3021`, `APP_ORIGIN=http://localhost:3021`, `PASSKEY_RP_ID=localhost`. Stop `storix/worker`, then run `portly start storix/prod-preview` (builds, then serves the API and the built web app with the real service worker on http://localhost:3021) and `portly start storix/prod-worker`.

### Scripts

| Script              | Description                                                             |
| ------------------- | ----------------------------------------------------------------------- |
| `pnpm lint`         | ESLint, including the layering rules                                    |
| `pnpm typecheck`    | TypeScript check in every package                                       |
| `pnpm test`         | Vitest unit tests (pure domain and schemas in `packages/shared`)        |
| `pnpm format`       | Prettier                                                                |
| `pnpm dev:db`       | Start PostgreSQL and MinIO through Docker Compose                       |
| `pnpm db:generate`  | Generate a Drizzle migration                                            |
| `pnpm db:migrate`   | Apply migrations (drizzle-kit)                                          |
| `pnpm build:api`    | Build the web app, then bundle the API, migrator and bootstrap CLI      |
| `pnpm build:worker` | Bundle the worker                                                       |
| `pnpm build`        | Both of the above                                                       |
| `pnpm start`        | Run the built API (serves the built web app when `NODE_ENV=production`) |
| `pnpm start:worker` | Run the built worker                                                    |
| `pnpm migrate:prod` | Apply migrations with the built migrator (no drizzle-kit needed)        |
| `pnpm preview:prod` | Build, then run in production mode with `.env.preview`                  |

### Ports

| Service            | Port |
| ------------------ | ---- |
| Web (Vite)         | 5180 |
| API                | 3020 |
| PostgreSQL         | 5440 |
| MinIO S3           | 9100 |
| MinIO console      | 9101 |
| Production preview | 3021 |

### Notes

- If the Better Auth tables are regenerated, `packages/db/src/schema/auth.ts` loses the `users.home_league_id` foreign key. Re-apply it (`references((): AnyPgColumn => leagues.id, ...)`) before `pnpm db:generate`.
- TypeScript stays on 6.0.x: `typescript-eslint` 8.72.1 declares `typescript <6.1.0`.

## Testing

Unit tests cover the pure domain and the Zod schemas in `packages/shared` only (Vitest): rarity, boosters, pity, dust, moderation, compensation, account deletion plan, storage GC rules, settings. Routes, services and the web app are verified by hand (real requests and the browser) during each task. There is no CI: run `pnpm lint && pnpm typecheck && pnpm test && pnpm build` before merging.

## Deploy (Railway)

- Project `storix`, environment `production`, region EU West (Amsterdam). Pushing `main` to `TristanHourtoulle/storix` builds `api` and `worker` from Dockerfiles (`apps/api/Dockerfile`, `apps/worker/Dockerfile`, repo root as build context): `node:24.22.1-bookworm-slim` pinned by digest from Docker Hub, pnpm from `packageManager` through corepack (npm registry). Nothing is downloaded from GitHub releases. There is no config-as-code file: each service is set to build from `apps/<service>/Dockerfile` through its Railway service setting (`dockerfilePath`), and its start command, pre-deploy step, health check and watch patterns live in the service settings too (Railway rejected config file paths). Each service rebuilds only when its watch patterns change (`api`: `apps/api`, `apps/web`, `packages`; `worker`: `apps/worker`, `packages`; both: `pnpm-lock.yaml`, `package.json`).

| Service        | Role                                 | Config                                                                                                                         |
| -------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `Postgres`     | PostgreSQL 18, 5 GB volume           | private network only                                                                                                           |
| `storix-media` | S3-compatible bucket, virtual-hosted | CORS set with `pnpm --filter @storix/storage set-cors --origins ...`                                                           |
| `api`          | Fastify API + built web app          | image build runs `pnpm build:api`, pre-deploy `pnpm migrate:prod`, start `pnpm start`, health check `/api/health`, CDN enabled |
| `worker`       | pg-boss jobs                         | image build runs `pnpm build:worker`, start `pnpm start:worker`; waits for the migrations at startup                           |

Variables (names only, values live in Railway):

- Both services: `NODE_ENV`, `LOG_LEVEL`, `DATABASE_URL` (reference to `Postgres`), `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (references to `storix-media`), `S3_REGION`, `S3_FORCE_PATH_STYLE`. The worker also accepts `MEDIA_CONCURRENCY`.
- api only: `BETTER_AUTH_SECRET`, `MEDIA_URL_SECRET` (set with `--stdin`), `APP_ORIGIN`, `PASSKEY_RP_ID`. `PORT` is injected by Railway.

Migrations run once per api deploy in the pre-deploy step. The worker may start before them, so its startup gate waits (see Background jobs). Keep migrations expand-only so the old and new code both run on the new schema during the overlap.

Logs: `railway logs --service api --environment production --lines 200` (add `--build` for the build log), same with `--service worker`.

### First user

Generate a password with `openssl rand -base64 18`, then pipe it over SSH so it never lands on a command line:

```sh
printf '%s\n' "$PASSWORD" | ssh <service-instance>@ssh.railway.com \
  'IFS= read -r P; BOOTSTRAP_PASSWORD="$P" node apps/api/dist/bootstrap.js --username <name> --league "<league name>"'
```

`railway ssh --service api` works too once `ssh.railway.com` is in `known_hosts`; `railway ssh config --service api --dry-run` shows the instance user.

### Custom domain

`storix.tristanhourtoulle.fr` is attached to the `api` service, with a CNAME `storix` and a TXT `_railway-verify.storix` in the Hostinger zone `tristanhourtoulle.fr` (values in the Railway dashboard). `APP_ORIGIN` and `PASSKEY_RP_ID` use this domain, so passkeys are bound to it. The Railway domain `https://api-production-2b79.up.railway.app` still answers, but logins from it fail the origin check.

## Known limitations / next steps

- Deferred features: Wonder Pick, trades, wishlist, duels and sets; crafting (code kept, route not registered); the home activity feed; booster replay tooling; an audit-log viewer; editing a capture date; league rename or deletion by its owner while other members exist.
- Sound effects: a proposal exists (booster opening, reveal by tier, reactions), not implemented.
- `storage.delete` race: the live-key check and the bucket delete are not atomic. A card removed and the same photo re-uploaded in the same milliseconds could lose its files. Fix: skip objects modified after the job was enqueued, or make variant keys unique per upload.
- The account deletion audit entry keeps the deleted username in its metadata. Drop it or store a hash.
- Advisory lock keys are `hashtext(scope:league)` in one 32-bit key space; a collision between scopes would break the lock order. Fix: use the two-key form, as the worker's league-media lock does (needs a coordinated api and worker deploy).
- Hidden cards stay in their owners' device caches (the hide is reversible), and signed URLs or CDN copies of deleted images stay valid until their window ends (48 h at most).
