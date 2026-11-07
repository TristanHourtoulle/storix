# Storix

Storix is an invite-only, mobile-first PWA where friends share photos inside private leagues and turn them into collectible cards opened from boosters.
This repository holds the foundation: accounts, leagues, members, invitations and the installable app shell.
See the [design spec](docs/superpowers/specs/2026-11-07-storix-design.md) and the [roadmap](docs/superpowers/plans/2026-11-07-storix-roadmap.md).

## Prerequisites

- Node 24 through nvm (`nvm use`, see `.nvmrc`)
- pnpm
- Docker (local PostgreSQL)
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

Start the database, apply migrations and create the first user and league:

```bash
pnpm dev:db
pnpm db:migrate
BOOTSTRAP_PASSWORD='choose-a-password' pnpm --filter @storix/api bootstrap --username <name> --league <league name>
```

Register and start the dev servers with Portly (`storix/api` on 3020, `storix/web` on 5180):

```bash
portly status --json
portly start storix/api --json
portly start storix/web --json
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
| `pnpm build`        | Build the web app, then bundle the API                                  |
| `pnpm start`        | Run the built API (serves the built web app when `NODE_ENV=production`) |
| `pnpm preview:prod` | Build, then run in production mode with `.env.preview`                  |

For the production preview, copy `.env` to `.env.preview` (gitignored) and set `NODE_ENV=production`, `PORT=3021`, `APP_ORIGIN=http://localhost:3021`, `PASSKEY_RP_ID=localhost`, then run it through Portly as `storix/prod-preview`.

## Ports

| Service            | Port |
| ------------------ | ---- |
| Web (Vite)         | 5180 |
| API                | 3020 |
| PostgreSQL         | 5440 |
| Production preview | 3021 |

## Architecture

```
apps/web         React 19, Vite, TanStack Router and Query, Tailwind v4, Serwist (PWA)
apps/api         Fastify 5, Better Auth, Zod type provider, pino
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

## Production

- Target: Railway, served at `https://storix.tristanhourtoulle.fr`.
- `NODE_ENV=production` makes the API serve the built web app (`apps/web/dist`, override with `WEB_DIST_DIR`) with an SPA fallback for HTML navigations. `/api/*` and `/media/*` never fall back to the SPA.
- Required environment: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `APP_ORIGIN=https://storix.tristanhourtoulle.fr`, `PASSKEY_RP_ID=storix.tristanhourtoulle.fr`, `PORT` (provided by Railway).
- Run `pnpm db:migrate` before starting a new release; the server does not migrate on boot.
- Build with `pnpm build`, start with `pnpm start`.
- Behind Railway the client IP is read from the `x-real-ip` header (one trusted proxy hop) for rate limiting. Do not expose the service without that proxy.
