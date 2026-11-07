# Storix

Storix is an invite-only, mobile-first PWA where friends share photos inside private leagues and turn them into collectible cards opened from boosters.
This repository holds the foundation: accounts, leagues, members, invitations and the installable app shell.
See the [design spec](docs/superpowers/specs/2026-11-07-storix-design.md) and the [roadmap](docs/superpowers/plans/2026-11-07-storix-roadmap.md).

## Prerequisites

- Node 24 through nvm (`nvm use`, see `.nvmrc`)
- pnpm
- Docker (local PostgreSQL and MinIO)
- Portly (runs every persistent dev server; never start them by hand)

## Setup

```bash
nvm use
pnpm install
cp .env.example .env
```

Generate a secret and put it in `.env` as `BETTER_AUTH_SECRET` (32 characters minimum):

```bash
openssl rand -base64 48
```

Also set `MEDIA_URL_SECRET` in `.env` (`openssl rand -base64 32`). The S3 variables in `.env.example` already point at the local MinIO.

Start PostgreSQL and MinIO (the `minio-init` job creates the `storix-media` bucket), apply migrations and create the first user and league:

```bash
pnpm dev:db
pnpm db:migrate
BOOTSTRAP_PASSWORD='choose-a-password' pnpm --filter @storix/api bootstrap --username <name> --league <league name>
```

Register and start the dev servers with Portly (`storix/api` on 3020, `storix/web` on 5180, `storix/worker` for image processing, no port):

```bash
portly status --json
portly start storix/api --json
portly start storix/web --json
portly start storix/worker --json
```

Then open http://localhost:5180.

## Local test credentials

There are no shared credentials in the repository. Create your own account with the bootstrap CLI above, choosing the username and `BOOTSTRAP_PASSWORD` yourself. Never commit `.env` or any `.env.*` file (only `.env.example` is tracked).

## Scripts

| Script              | Description                                                             |
| ------------------- | ----------------------------------------------------------------------- |
| `pnpm lint`         | ESLint, including the layering rules                                    |
| `pnpm typecheck`    | TypeScript check in every package                                       |
| `pnpm test`         | Vitest unit tests (pure domain functions in `packages/shared`)          |
| `pnpm format`       | Prettier                                                                |
| `pnpm dev:db`       | Start PostgreSQL through Docker Compose                                 |
| `pnpm db:generate`  | Generate a Drizzle migration                                            |
| `pnpm db:migrate`   | Apply migrations                                                        |
| `pnpm build:api`    | Build the web app, then bundle the API, migrator and bootstrap CLI      |
| `pnpm build:worker` | Bundle the media worker                                                 |
| `pnpm build`        | Both of the above                                                       |
| `pnpm start`        | Run the built API (serves the built web app when `NODE_ENV=production`) |
| `pnpm start:worker` | Run the built worker                                                    |
| `pnpm migrate:prod` | Apply migrations with the built migrator (no drizzle-kit needed)        |
| `pnpm preview:prod` | Build, then run in production mode with `.env.preview`                  |

For the production preview, copy `.env` to `.env.preview` (gitignored) and set `NODE_ENV=production`, `PORT=3021`, `APP_ORIGIN=http://localhost:3021`, `PASSKEY_RP_ID=localhost`, then run the API through Portly as `storix/prod-preview` and the built worker as `storix/prod-worker` (`node --env-file=.env.preview apps/worker/dist/main.js`). Stop the dev `storix/worker` while the preview worker runs.

## Ports

| Service            | Port |
| ------------------ | ---- |
| Web (Vite)         | 5180 |
| API                | 3020 |
| PostgreSQL         | 5440 |
| MinIO S3           | 9100 |
| MinIO console      | 9101 |
| Production preview | 3021 |

## Architecture

```
apps/web         React 19, Vite, TanStack Router and Query, Tailwind v4, Serwist (PWA)
apps/api         Fastify 5, Better Auth, Zod type provider, pino
apps/worker      pg-boss consumer: image pipeline (sharp), cards, upload sweep
packages/storage S3 gateway (presigned POST, object reads and writes)
packages/shared  Zod schemas and the pure domain (roles, invitations, reset codes)
packages/db      Drizzle schema, client and migrations
```

Layering rules, enforced by `no-restricted-imports` overrides in `eslint.config.js` (so `pnpm lint` fails on a violation):

- Routes (`*.routes.ts`, `http/`) are HTTP only: no database, no repositories, no Better Auth (except `better-auth/node` in `auth.routes.ts`).
- Services (`*.service.ts`) are use cases: no SQL, no Fastify objects, no auth library, no route imports. Only type imports from `@storix/db`.
- Repositories (`*.repository.ts`) are Drizzle only: no rules, no HTTP, no services or routes.
- `packages/shared` does not depend on the db, Fastify, React, Drizzle or Better Auth. `packages/shared/src/domain` is pure and imports only from itself (tests excepted).
- React components are presentational; data access lives in hooks (components and routes cannot import `*.api`, `lib/http` or `lib/auth-client`).

### Auth model

- Invite-only: an account is created by redeeming an invitation link (or by the bootstrap CLI for the first user).
- No email anywhere. Users never see or type one. Better Auth still requires an address, so a synthetic internal one (`users.storix.invalid`) is generated per user.
- Username and password, with a passkey offered after the first login. Usernames are case-insensitive.
- Each user has a home league: the first league they joined, fixed at signup.
- Forgotten password: only the owner of the member's home league can generate a single-use reset code (valid 24 h, stored hashed, audited, invalidates all of the member's sessions). If the home league is gone or has no owner, no reset is possible; the member relies on a passkey or their password. The code is entered with a new password and is accepted regardless of case, spaces, a missing dash, or `O`/`I`/`L` typed for `0`/`1`.

### Regenerating the Better Auth schema

If the Better Auth tables are ever regenerated (CLI schema generation), the generated `packages/db/src/schema/auth.ts` loses the `users.home_league_id` foreign key to `leagues.id`. Re-apply it (a lazy reference, `references((): AnyPgColumn => leagues.id, ...)`) before running `pnpm db:generate`, and check the generated migration still contains the constraint.

### TypeScript version

The repository uses TypeScript 6.0.x, not 7.x: `typescript-eslint` 8.72.1 declares the peer range `typescript >=4.8.4 <6.1.0`. Move to 7.x once typescript-eslint supports it.

### Uploads and media

- Upload: the client asks the API for a presigned POST (`content-length-range` 1 byte to 15 MB, exact `Content-Type`, a `Cache-Control` form field enforced by an `eq` condition), posts the file straight to the bucket (the CSP `connect-src` allows the bucket origin), then calls complete with the card title and tags. Presigned PUT is never used.
- Worker pipeline: completing an upload enqueues a pg-boss job. The worker downloads the original, strips EXIF and GPS, produces AVIF and WebP variants, a thumbhash and a dominant color, creates the card and deletes the original. A scheduled sweep removes stranded uploads.
- Serving: `GET /media/{windowStart}/{hmac}/{objectKey}`. The HMAC-SHA256 covers `windowStart` and `objectKey` with `MEDIA_URL_SECRET`; windows are 24 h UTC and the current and previous ones are accepted. Successes are `Cache-Control: public, max-age=<seconds until the URL expires>, immutable` with no cookie and no session lookup; errors are `no-store`.
- CDN: because `/media` responses are public and immutable, a CDN in front of the API can cache them per URL.
- Service worker: media are cached under a key without the window and signature segments (`/media/img/...`, cache `storix-media-v1`), so a rotated URL still hits the cache. Card reads use NetworkFirst in `storix-api-v1`, which is deleted on logout. `sw.js`, `index.html` and `manifest.webmanifest` are served `no-store` so a CDN can never keep a stale shell after a deploy; the precache keeps the shell available offline.

## Production

- Host: Railway, project `storix`, environment `production`, region EU West (Amsterdam).
- Live origin until the custom domain is switched: `https://api-production-2b79.up.railway.app`. Target: `https://storix.tristanhourtoulle.fr`.
- Deploys: pushing `main` to `TristanHourtoulle/storix` builds `api` and `worker` (Railpack, Node 24, pnpm from `packageManager`); each service only rebuilds when its watch patterns change.

### Services

| Service        | Role                                                                                                     | Config                                                                                                                                     |
| -------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `Postgres`     | PostgreSQL 18, 5 GB volume                                                                               | private network only                                                                                                                       |
| `storix-media` | Bucket (S3-compatible, virtual-hosted style), browser uploads go to `https://<bucket>.t3.storageapi.dev` | CORS set with `pnpm --filter @storix/storage set-cors --origins ...`                                                                       |
| `api`          | Fastify API + built web app                                                                              | build `pnpm build:api`, pre-deploy `pnpm migrate:prod`, start `pnpm start`, health check `/api/health`, CDN enabled (purge HTML on deploy) |
| `worker`       | pg-boss media jobs (process + sweep)                                                                     | build `pnpm build:worker`, start `pnpm start:worker`                                                                                       |

### Variables

- Both services: `NODE_ENV=production`, `LOG_LEVEL=info`, `RAILPACK_NODE_VERSION=24`, `DATABASE_URL=${{Postgres.DATABASE_URL}}`, `S3_ENDPOINT=${{storix-media.ENDPOINT}}`, `S3_BUCKET=${{storix-media.BUCKET}}`, `S3_ACCESS_KEY_ID=${{storix-media.ACCESS_KEY_ID}}`, `S3_SECRET_ACCESS_KEY=${{storix-media.SECRET_ACCESS_KEY}}`, `S3_REGION=auto`, `S3_FORCE_PATH_STYLE=false`. The worker also accepts `MEDIA_CONCURRENCY` (default 2).
- api only: `BETTER_AUTH_SECRET` and `MEDIA_URL_SECRET` (each `openssl rand -base64 32`, set with `--stdin`), `APP_ORIGIN`, `PASSKEY_RP_ID`. `PORT` is injected by Railway.
- `NODE_ENV=production` makes the API serve `apps/web/dist` (override with `WEB_DIST_DIR`) with an SPA fallback for HTML navigations; `/api/*` and `/media/*` never fall back to the SPA. Both services probe the bucket at startup and exit with a fatal log when it is unreachable.
- `pnpm migrate:prod` reads `DATABASE_URL` and `packages/db/drizzle` (override with `MIGRATIONS_DIR`); the server does not migrate on boot.

### Caching

- `/media/*` responses are `public, max-age=..., immutable` and cached by the CDN (`x-cache: HIT` from the second GET; HEAD requests bypass the CDN). Invalid signatures return `403` with `no-store` and are never cached.
- `/api/*`, `/sw.js` and HTML are `no-store`.

### Client IP and rate limiting

- The Railway edge overwrites `X-Real-IP` with the client address and rebuilds `X-Forwarded-For` as `<client>, <cdn edge>` (client-supplied values are dropped). Fastify trusts two proxy hops so `request.ip` is the client; Better Auth reads `X-Real-IP`. Do not expose the service without the Railway edge.

### First user

Generate a password with `openssl rand -base64 18`, then pipe it over SSH so it never lands on a command line:

```sh
printf '%s\n' "$PASSWORD" | ssh <service-instance>@ssh.railway.com \
  'IFS= read -r P; BOOTSTRAP_PASSWORD="$P" node apps/api/dist/bootstrap.js --username <name> --league "<league name>"'
```

(`railway ssh --service api` works too once `ssh.railway.com` is in `known_hosts`; `railway ssh config --service api --dry-run` shows the instance user.)

### Custom domain `storix.tristanhourtoulle.fr`

The domain is attached to the `api` service. DNS records in the Hostinger zone `tristanhourtoulle.fr`:

| Type  | Name                     | Value                                                                             |
| ----- | ------------------------ | --------------------------------------------------------------------------------- |
| CNAME | `storix`                 | `605y2uyf.up.railway.app`                                                         |
| TXT   | `_railway-verify.storix` | `railway-verify=14bdb557eccc0ec20b1b39efa98dbf65020bd345c2aa60460a5136b2f7708402` |

Switch procedure, once `railway domain status storix.tristanhourtoulle.fr --service api --json` shows the domain verified and the certificate issued:

1. `railway variable set APP_ORIGIN=https://storix.tristanhourtoulle.fr PASSKEY_RP_ID=storix.tristanhourtoulle.fr --service api` (one deploy).
2. Passkeys registered on the Railway domain stop working and must be added again; password login keeps working.
3. The bucket CORS rules already allow `https://storix.tristanhourtoulle.fr`.
