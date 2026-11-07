# Storix Plan 1 — Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Commits:** every task ends with a commit step, but `git add` / `git commit` run ONLY after the user's explicit go-ahead at execution time. Without it, stop at the step and report.

**Goal:** A running app where a user signs up through an invite link, logs in with username + password, registers a passkey, creates a league, invites others, manages members and roles, and redeems an admin-issued reset code; the web app is an installable PWA shell in design A with the bottom nav and empty states for screens built in later plans.

**Architecture:** pnpm monorepo. `apps/api` (Fastify 5) mounts Better Auth (username + passkey plugins, DB sessions) and exposes league-scoped feature modules split into routes / services / repositories; pure rules live in `packages/shared/src/domain`; Drizzle schema and migrations in `packages/db`. `apps/web` (Vite + React 19 + TanStack Router/Query + Tailwind 4 + Serwist) talks to the API same-origin (Vite proxy in dev, the API serves the built SPA in prod).

**Tech Stack:** pnpm workspaces, Node 24 LTS, TypeScript (strict), Fastify 5, fastify-type-provider-zod, Better Auth + @better-auth/passkey, Drizzle ORM + drizzle-kit + pg, Zod 4, pino, Vitest, Vite 8, React 19, TanStack Router (file-based) + Query, Tailwind 4, @serwist/vite, PostgreSQL 18 (Docker Compose), Portly, tsx, tsdown.

**Spec:** `docs/superpowers/specs/2026-11-07-storix-design.md` (roadmap: `docs/superpowers/plans/2026-11-07-storix-roadmap.md`). Visual source of truth: the `<style>` block of the direction A mockup (tokens copied into Task 11).

## Global Constraints

- Product name `Storix`, package scope `@storix/*`, production origin `https://storix.tristanhourtoulle.fr`.
- Latest stable version of every dependency at install time: check each with `npm view <pkg> version` before adding it. Reference versions seen 2026-11-07: vite 8.3.6, react 19.3.1, @tanstack/react-router 1.170.46, @tanstack/react-query 5.107.1, fastify 5.12.8, drizzle-orm 0.45.4, better-auth 1.7.18, zod 4.6.7, tailwindcss 4.3.5, @serwist/vite 9.5.13, typescript 7.0.2.
- TypeScript exception (my call): typescript-eslint 8.72.1 declares `typescript >=4.8.4 <6.1.0`. If its peer range still excludes 7.x at install time, use the latest TypeScript 6.0.x (6.0.3 on 2026-11-07) repo-wide and note it in the README; otherwise use 7.x.
- Context7 is unavailable: before coding against Better Auth (username + passkey plugins, Fastify integration, `auth.api.*`, `auth.$context`), Serwist Vite, TanStack Router file-based routing, Tailwind v4 `@theme`, fastify-type-provider-zod, tsdown and drizzle-kit, read the official docs on the web and verify every signature this plan pins. If a pinned signature is wrong, keep the behavior and adapt the call, then say so in the task report.
- TypeScript everywhere, `strict`, `noUncheckedIndexedAccess`, `noImplicitReturns`, no `any` (use `unknown` + guards), immutable data (no `push`, no in-place mutation), Zod at every boundary (env, HTTP input and output, web responses).
- NO comments in code except basic JSDoc on public functions. Everything in English: code, README, logs, commit messages (Conventional Commits `type(scope): description`). UI copy in French.
- Strict layering: routes = HTTP only; services = use cases (no SQL, no HTTP objects); repositories = Drizzle only, no rules; `packages/shared/src/domain` = pure, no imports outside itself; React components presentational, data in hooks.
- Tests: Vitest unit tests ONLY for pure functions in `packages/shared/src/domain`. No other test suites, no CI/CD. Every other task ends with a manual verification (command + expected output, or a browser check).
- Files 200-400 lines max. No `console.*` (pino on the API; `apps/web/src/lib/logger.ts` is the only file allowed to call `console`).
- Ports: web 5180, api 3020, postgres 5440, prod preview 3021. Never use 3000, 3001, 3003, 3004, 4001-4004, 4009, 5433, 8080, 9000. Persistent dev servers run only through Portly (`portly ...`), never as background processes.
- No email anywhere in the product: users never see or type an email.
- Future `/media` route (Plan 2, see spec addendum): the API will serve images same-origin at `GET /media/{windowStart}/{hmac}/{objectKey}` behind the Railway CDN. Nothing in this plan may break that: no global hook sets cookies or `Cache-Control: no-store`/`private` outside `/api/*`; `authenticate` and Better Auth session lookups run only on routes that opt in, never globally; no `@fastify/cors` (everything stays same-origin); the SPA fallback never answers `/media/*`.

## Review Focus

1. Two people redeeming the last use of an invitation at the same instant: exactly one gets in, the other sees "lien plus valide" (Task 8, concurrent curl check).
2. Usernames differing only by case ("Max" / "max"): the second signup is refused with "pseudo déjà pris", and login works with either casing (Task 8 verification).
3. A reset code typed with lowercase, spaces, missing dash, or `O`/`I`/`L` instead of `0`/`1`: it is accepted (Task 2 `normalizeResetCode` tests).
4. After a reset, a second device that was logged in as that user is logged out on its next request (Task 10, two cookie jars).
5. A session that expires or is revoked while the app is open: the next API call sends the user to `/login` and returns them to where they were after login (Task 11 QueryCache handler, Task 12 browser check).

---

## File Structure

```
package.json  pnpm-workspace.yaml  tsconfig.base.json  eslint.config.js  .prettierrc.json  .prettierignore
.gitignore  .nvmrc  .env.example  docker-compose.yml  AGENTS.md  README.md
packages/shared/src/
  index.ts                      re-exports schemas + domain
  domain/index.ts  roles.ts  invitations.ts  reset-codes.ts  (+ *.test.ts)
  schemas/common.ts  auth.ts  leagues.ts  invitations.ts  members.ts  reset-codes.ts  errors.ts  index.ts
packages/db/
  drizzle.config.ts  drizzle/ (generated SQL)
  src/index.ts  client.ts  schema/{index,auth,leagues,invitations,reset-codes,audit-log}.ts
apps/api/
  tsdown.config.ts
  src/server.ts  app.ts  deps.ts
  src/config/env.ts
  src/lib/{errors,crypto,transaction,logger}.ts
  src/auth/{auth.ts,auth.cli.ts,auth.gateway.ts,auth.routes.ts}
  src/http/{authenticate.ts,league-guard.ts,origin-check.ts,rate-limit.ts,error-handler.ts,static.ts}
  src/features/health/{health.routes,health.service,health.repository}.ts
  src/features/me/{me.routes,me.service}.ts
  src/features/leagues/{leagues.routes,leagues.service,leagues.repository}.ts
  src/features/members/{members.routes,members.service,members.repository}.ts
  src/features/invitations/{invitations.routes,invitations.service,invitations.repository}.ts
  src/features/reset-codes/{reset-codes.routes,reset-codes.service,reset-codes.repository}.ts
  src/features/audit/audit.repository.ts
  src/features/users/users.repository.ts
  src/cli/bootstrap.ts
apps/web/
  index.html  vite.config.ts  public/manifest.webmanifest  public/icons/*
  src/main.tsx  router.tsx  sw.ts  styles/app.css
  src/lib/{http,auth-client,logger,query-client,storage,platform}.ts
  src/components/ui/{button,input,field,icon,top-bar,bottom-nav,empty-state,dialog,avatar,notice}.tsx
  src/features/auth/        auth.api.ts  session.queries.ts  use-login.ts  use-logout.ts  use-passkeys.ts  use-change-password.ts  components/
  src/features/invitations/ invitations.api.ts  invitations.queries.ts  use-*.ts  components/
  src/features/leagues/     leagues.api.ts  leagues.queries.ts  use-*.ts  components/
  src/features/members/     members.api.ts  members.queries.ts  use-*.ts  components/
  src/features/reset-codes/ reset-codes.api.ts  use-*.ts  components/
  src/features/errors/error-messages.ts
  src/features/pwa/         register-sw.ts  use-ios-install-hint.ts  components/ios-install-hint.tsx
  src/routes/__root.tsx  login.tsx  join.$token.tsx  reset.tsx
  src/routes/_authed.tsx  _authed/index.tsx  _authed/leagues.new.tsx
  src/routes/_authed/l.$leagueId.tsx  l.$leagueId.index.tsx  l.$leagueId.collection.tsx  l.$leagueId.add.tsx  l.$leagueId.profile.tsx  l.$leagueId.admin.tsx
```

---

### Task 1: Monorepo tooling, layer boundaries, local Postgres

**Files:**
- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.js`, `.prettierrc.json`, `.prettierignore`, `.gitignore`, `.nvmrc`, `.env.example`, `docker-compose.yml`, `AGENTS.md`

**Interfaces:**
- Produces: root scripts `lint`, `format`, `typecheck` (`pnpm -r typecheck`), `test` (`pnpm --filter @storix/shared test`), `db:generate`, `db:migrate`, `dev:db` (`docker compose up -d postgres`), `build`. Every package defines `typecheck: tsc -p . --noEmit`.

- [ ] **Step 1: Root workspace.** `package.json` (`private: true`, `type: module`, `packageManager: pnpm@<latest>`, `engines.node: ">=24"`), `pnpm-workspace.yaml` with `apps/*` and `packages/*`, `.nvmrc` = `24`. Dev deps at root: typescript, eslint, @eslint/js, typescript-eslint, eslint-plugin-react-hooks, globals, prettier.
- [ ] **Step 2: `tsconfig.base.json`.** `strict`, `noUncheckedIndexedAccess`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, `isolatedModules`, `module: "preserve"`, `moduleResolution: "bundler"`, `target: "ES2023"`, `skipLibCheck`, `noEmit`. No `baseUrl` (removed in TS 7; use `paths` only).
- [ ] **Step 3: `eslint.config.js` (flat config).** Mechanism: built-in `no-restricted-imports` with per-glob `files` overrides — our layers are identified by file suffix and folder, which flat-config globs match exactly, so no extra plugin or import resolver is needed. Base: `@eslint/js` recommended + typescript-eslint `recommended` (type-checked variant only if it supports the installed TS), `@typescript-eslint/no-explicit-any: error`, `no-console: error` (off for `apps/web/src/lib/logger.ts`), react-hooks recommended for `apps/web/**`. Boundary overrides (each with a `message` naming the layer rule):

| files | forbidden import patterns |
|---|---|
| `packages/shared/src/domain/**` | everything except `./*` (regex `^(?!\./)`) |
| `packages/shared/**` | `@storix/db`, `fastify`, `react`, `drizzle-orm*`, `better-auth*` |
| `apps/api/src/**/*.routes.ts`, `apps/api/src/http/**` | `drizzle-orm*`, `@storix/db`, `pg`, `**/*.repository*`, `better-auth*` (except `apps/api/src/auth/auth.routes.ts`, which may import `better-auth/node`) |
| `apps/api/src/**/*.service.ts` | `fastify`, `drizzle-orm*`, `@storix/db` (type imports allowed: `allowTypeImports: true`), `better-auth*`, `**/*.routes*` |
| `apps/api/src/**/*.repository.ts` | `fastify`, `better-auth*`, `**/*.service*`, `**/*.routes*` |
| `apps/web/src/**/components/**`, `apps/web/src/routes/**` | `**/*.api`, `**/lib/http`, `**/lib/auth-client` |

- [ ] **Step 4: Prettier.** `.prettierrc.json`: `{ "semi": false, "singleQuote": true, "trailingComma": "all", "printWidth": 100 }`; ignore `pnpm-lock.yaml`, `**/dist`, `**/drizzle`, `**/routeTree.gen.ts`.
- [ ] **Step 5: `docker-compose.yml`.** Service `postgres`: image `postgres:18-alpine`, env `POSTGRES_USER=storix POSTGRES_PASSWORD=storix POSTGRES_DB=storix`, ports `"5440:5432"`, named volume `storix-pg` mounted at `/var/lib/postgresql` (PG 18 image layout), healthcheck `pg_isready -U storix`.
- [ ] **Step 6: `.env.example`.** `NODE_ENV=development`, `PORT=3020`, `DATABASE_URL=postgres://storix:storix@localhost:5440/storix`, `APP_ORIGIN=http://localhost:5180`, `BETTER_AUTH_SECRET=` (comment-free; README says: 32+ chars, `openssl rand -base64 32`), `PASSKEY_RP_ID=localhost`, `LOG_LEVEL=debug`. `.gitignore`: `node_modules`, `dist`, `.env`, `.env.*`, `!.env.example`, `.DS_Store`.
- [ ] **Step 7: `AGENTS.md`.** Add the Portly rule verbatim from the `portly` skill ("## Development servers" block, three bullets) plus one line: "Ports: web 5180, api 3020, postgres 5440, prod preview 3021."
- [ ] **Step 8: Verify.**
  Run: `pnpm install && pnpm lint && cp .env.example .env && pnpm dev:db && docker compose exec postgres pg_isready -U storix`
  Expected: install succeeds, lint prints no errors, last line `/var/run/postgresql:5432 - accepting connections`.
  Boundary check: create `packages/shared/src/domain/tmp.ts` containing `import { z } from 'zod'`, run `pnpm lint` → error from `no-restricted-imports`; delete the file.
- [ ] **Step 9: Commit** (after go-ahead): `chore(repo): set up pnpm monorepo tooling and local postgres`

---

### Task 2: Pure domain rules (roles, invitations, reset codes)

**Files:**
- Create: `packages/shared/package.json` (`name: @storix/shared`, exports `"."`: `./src/index.ts`, `"./domain"`: `./src/domain/index.ts`; scripts `test: vitest run`, `typecheck`), `packages/shared/tsconfig.json`, `packages/shared/src/domain/{roles,invitations,reset-codes,index}.ts`
- Test: `packages/shared/src/domain/{roles,invitations,reset-codes}.test.ts`

**Interfaces:**
- Produces (all exported from `@storix/shared/domain`):
  - `LEAGUE_ROLES = ['owner','admin','member'] as const`; `type LeagueRole`
  - `hasRoleAtLeast(role: LeagueRole, min: LeagueRole): boolean` (rank owner 2 > admin 1 > member 0)
  - `canManageInvitations(role: LeagueRole): boolean` (admin or owner)
  - `canChangeRole(input: { actorRole: LeagueRole; targetRole: LeagueRole; nextRole: LeagueRole; isSelf: boolean }): boolean`
  - `canRemoveMember(input: { actorRole: LeagueRole; targetRole: LeagueRole; isSelf: boolean }): boolean`
  - `INVITATION_EXPIRY_DAYS = [1, 7, 30] as const`; `INVITATION_MAX_USES_LIMIT = 50`
  - `type InvitationStatus = 'valid' | 'revoked' | 'expired' | 'exhausted'`
  - `evaluateInvitation(inv: { expiresAt: Date; maxUses: number; uses: number; revokedAt: Date | null }, now: Date): InvitationStatus` (precedence revoked > expired > exhausted > valid)
  - `invitationExpiry(createdAt: Date, days: InvitationExpiryDays): Date`
  - `RESET_CODE_TTL_MS = 86_400_000`; `RESET_CODE_MAX_ATTEMPTS = 5`; `RESET_CODE_LENGTH = 10`; `RESET_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'`
  - `type ResetCodeDenialReason = 'SELF_RESET' | 'NO_HOME_LEAGUE' | 'OTHER_LEAGUE' | 'HOME_LEAGUE_HAS_NO_OWNER' | 'NOT_HOME_LEAGUE_OWNER' | 'TARGET_LEFT_HOME_LEAGUE'`
  - `canIssueResetCode(input: { issuerId: string; leagueId: string; targetUserId: string; targetHomeLeagueId: string | null; homeLeagueOwnerId: string | null; targetIsHomeLeagueMember: boolean }): { allowed: true } | { allowed: false; reason: ResetCodeDenialReason }` — checks in this order: SELF_RESET, NO_HOME_LEAGUE, OTHER_LEAGUE (leagueId ≠ targetHomeLeagueId), HOME_LEAGUE_HAS_NO_OWNER, NOT_HOME_LEAGUE_OWNER, TARGET_LEFT_HOME_LEAGUE
  - `resetCodeExpiry(issuedAt: Date): Date`
  - `isResetCodeRedeemable(code: { expiresAt: Date; usedAt: Date | null; failedAttempts: number }, now: Date): boolean`
  - `normalizeResetCode(raw: string): string` (uppercase, drop every char that is not `[0-9A-Z]`, map `O→0`, `I→1`, `L→1`)
  - `formatResetCode(normalized: string): string` (`XXXXX-XXXXX`)

- [ ] **Step 1: Write the failing tests.**

```ts
// reset-codes.test.ts
const base = { issuerId: 'owner', leagueId: 'L1', targetUserId: 'u1', targetHomeLeagueId: 'L1', homeLeagueOwnerId: 'owner', targetIsHomeLeagueMember: true }
it('allows the owner of the target home league', () => expect(canIssueResetCode(base)).toEqual({ allowed: true }))
it('refuses an admin who is not the home league owner', () =>
  expect(canIssueResetCode({ ...base, issuerId: 'admin' })).toEqual({ allowed: false, reason: 'NOT_HOME_LEAGUE_OWNER' }))
it('refuses the owner of another league the target joined later', () =>
  expect(canIssueResetCode({ ...base, leagueId: 'L2' })).toEqual({ allowed: false, reason: 'OTHER_LEAGUE' }))
it('refuses when the home league no longer exists', () =>
  expect(canIssueResetCode({ ...base, targetHomeLeagueId: null })).toEqual({ allowed: false, reason: 'NO_HOME_LEAGUE' }))
it('refuses when the home league has no owner', () =>
  expect(canIssueResetCode({ ...base, homeLeagueOwnerId: null })).toEqual({ allowed: false, reason: 'HOME_LEAGUE_HAS_NO_OWNER' }))
it('refuses a self reset', () =>
  expect(canIssueResetCode({ ...base, targetUserId: 'owner' })).toEqual({ allowed: false, reason: 'SELF_RESET' }))
it('refuses when the target left the home league', () =>
  expect(canIssueResetCode({ ...base, targetIsHomeLeagueMember: false })).toEqual({ allowed: false, reason: 'TARGET_LEFT_HOME_LEAGUE' }))
it('expires exactly 24h after issue', () =>
  expect(resetCodeExpiry(new Date('2026-11-07T10:00:00Z')).toISOString()).toBe('2026-11-08T10:00:00.000Z'))
it('is not redeemable once used, expired, or after 5 failed attempts', () => {
  const now = new Date('2026-11-07T12:00:00Z'); const ok = { expiresAt: new Date('2026-11-08T00:00:00Z'), usedAt: null, failedAttempts: 0 }
  expect(isResetCodeRedeemable(ok, now)).toBe(true)
  expect(isResetCodeRedeemable({ ...ok, usedAt: now }, now)).toBe(false)
  expect(isResetCodeRedeemable({ ...ok, expiresAt: now }, now)).toBe(false)
  expect(isResetCodeRedeemable({ ...ok, failedAttempts: 5 }, now)).toBe(false)
})
it('normalizes user input', () => {
  expect(normalizeResetCode(' abcde-fghjk ')).toBe('ABCDEFGHJK')
  expect(normalizeResetCode('oil0x xxxxx')).toBe('0110XXXXXX')
})
it('formats with a dash', () => expect(formatResetCode('ABCDEFGHJK')).toBe('ABCDE-FGHJK'))

// invitations.test.ts
const now = new Date('2026-11-07T12:00:00Z')
const inv = { expiresAt: new Date('2026-11-14T12:00:00Z'), maxUses: 10, uses: 3, revokedAt: null }
it('is valid', () => expect(evaluateInvitation(inv, now)).toBe('valid'))
it('is expired at the exact expiry instant', () => expect(evaluateInvitation({ ...inv, expiresAt: now }, now)).toBe('expired'))
it('is exhausted when uses reach maxUses', () => expect(evaluateInvitation({ ...inv, uses: 10 }, now)).toBe('exhausted'))
it('reports revoked before expired', () =>
  expect(evaluateInvitation({ ...inv, revokedAt: now, expiresAt: now }, now)).toBe('revoked'))
it('computes expiry from days', () =>
  expect(invitationExpiry(now, 7).toISOString()).toBe('2026-11-14T12:00:00.000Z'))

// roles.test.ts
it('ranks roles', () => { expect(hasRoleAtLeast('admin', 'member')).toBe(true); expect(hasRoleAtLeast('admin', 'owner')).toBe(false) })
it('lets admins and owners manage invitations', () => { expect(canManageInvitations('admin')).toBe(true); expect(canManageInvitations('member')).toBe(false) })
it('only the owner changes roles, never on self or the owner, never to owner', () => {
  expect(canChangeRole({ actorRole: 'owner', targetRole: 'member', nextRole: 'admin', isSelf: false })).toBe(true)
  expect(canChangeRole({ actorRole: 'admin', targetRole: 'member', nextRole: 'admin', isSelf: false })).toBe(false)
  expect(canChangeRole({ actorRole: 'owner', targetRole: 'member', nextRole: 'owner', isSelf: false })).toBe(false)
  expect(canChangeRole({ actorRole: 'owner', targetRole: 'admin', nextRole: 'admin', isSelf: false })).toBe(false)
  expect(canChangeRole({ actorRole: 'owner', targetRole: 'owner', nextRole: 'member', isSelf: true })).toBe(false)
})
it('removal: owner removes non-owners, admin removes members only, nobody removes self', () => {
  expect(canRemoveMember({ actorRole: 'owner', targetRole: 'admin', isSelf: false })).toBe(true)
  expect(canRemoveMember({ actorRole: 'admin', targetRole: 'member', isSelf: false })).toBe(true)
  expect(canRemoveMember({ actorRole: 'admin', targetRole: 'admin', isSelf: false })).toBe(false)
  expect(canRemoveMember({ actorRole: 'member', targetRole: 'member', isSelf: false })).toBe(false)
  expect(canRemoveMember({ actorRole: 'owner', targetRole: 'owner', isSelf: true })).toBe(false)
})
```

- [ ] **Step 2: Run** `pnpm test` → FAIL (modules not found).
- [ ] **Step 3: Implement** the functions listed in Interfaces in `roles.ts`, `invitations.ts`, `reset-codes.ts`; `index.ts` re-exports them. No imports outside `./`. JSDoc one line each.
- [ ] **Step 4: Run** `pnpm test && pnpm lint && pnpm typecheck` → all tests PASS, no lint/type errors.
- [ ] **Step 5: Commit** (after go-ahead): `feat(shared): add pure rules for roles, invitations and reset codes`

---

### Task 3: Shared Zod contracts

**Files:**
- Create: `packages/shared/src/schemas/{common,errors,auth,leagues,invitations,members,reset-codes,index}.ts`, `packages/shared/src/index.ts`

**Interfaces:**
- Consumes: `LEAGUE_ROLES`, `INVITATION_EXPIRY_DAYS`, `INVITATION_MAX_USES_LIMIT`, `InvitationStatus` (Task 2).
- Produces (schemas + inferred types, exported from `@storix/shared`):
  - `common.ts`: `idSchema = z.string().min(1)`, `isoDateSchema = z.iso.datetime()`, `leagueRoleSchema = z.enum(LEAGUE_ROLES)`
  - `errors.ts`: `ERROR_CODES = ['VALIDATION_FAILED','UNAUTHENTICATED','FORBIDDEN','NOT_FOUND','CSRF_ORIGIN_MISMATCH','RATE_LIMITED','USERNAME_TAKEN','INVITATION_INVALID','ALREADY_MEMBER','RESET_NOT_ALLOWED','INVALID_RESET_CODE','INTERNAL_ERROR'] as const`; `type ErrorCode`; `apiErrorSchema = z.object({ error: z.object({ code: z.enum(ERROR_CODES), message: z.string(), details: z.record(z.string(), z.unknown()).optional() }) })`
  - `auth.ts`: `usernameSchema = z.string().trim().min(3).max(24).regex(/^[A-Za-z0-9_.]+$/)`, `passwordSchema = z.string().min(10).max(128)`, `sessionUserSchema = { id, username, displayUsername }`, `meResponseSchema = { user: sessionUserSchema, leagues: LeagueSummary[] }`
  - `leagues.ts`: `leagueNameSchema = z.string().trim().min(2).max(40)`, `createLeagueBodySchema = { name }`, `leagueSummarySchema = { id, name, role, memberCount }`, `leagueDetailSchema = { id, name, memberCount, myRole, permissions: { canManageInvitations: boolean, canManageMembers: boolean } }`, `leagueParamsSchema = { leagueId: z.uuid() }`
  - `invitations.ts`: `invitationTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/)`, `createInvitationBodySchema = { expiresInDays: z.union(INVITATION_EXPIRY_DAYS literals), maxUses: z.int().min(1).max(INVITATION_MAX_USES_LIMIT) }`, `invitationSummarySchema = { id, createdBy: string | null, expiresAt, maxUses, uses, status }`, `createInvitationResponseSchema = { invitation, url }`, `invitationPreviewSchema = { status, league: { name, memberCount } | null, invitedBy: string | null, isMember: boolean }` (league and invitedBy are null unless status is `valid`), `signupBodySchema = { username, password }`, `joinResponseSchema = { leagueId }`
  - `members.ts`: `memberSummarySchema = { userId, displayUsername, role, joinedAt, isSelf, canChangeRole, canRemove, canIssueResetCode }`, `updateMemberRoleBodySchema = { role: z.enum(['admin','member']) }`, `memberParamsSchema = { leagueId: z.uuid(), userId: idSchema }`
  - `reset-codes.ts`: `issueResetCodeResponseSchema = { code: string, expiresAt }`, `redeemResetCodeBodySchema = { username, code: z.string().min(1).max(32), newPassword: passwordSchema }`

- [ ] **Step 1: Implement** the schemas above (dates as ISO strings on the wire).
- [ ] **Step 2: Verify** `pnpm lint && pnpm typecheck` → no errors.
- [ ] **Step 3: Commit** (after go-ahead): `feat(shared): add zod contracts for auth, leagues, invitations, members and reset codes`

---

### Task 4: Database package, Better Auth config, schema and first migration

**Files:**
- Create: `packages/db/{package.json,tsconfig.json,drizzle.config.ts}`, `packages/db/src/{index,client}.ts`, `packages/db/src/schema/{index,auth,leagues,invitations,reset-codes,audit-log}.ts`
- Create: `apps/api/{package.json,tsconfig.json}`, `apps/api/src/config/env.ts`, `apps/api/src/auth/auth.ts`, `apps/api/src/auth/auth.cli.ts`

**Interfaces:**
- Produces from `@storix/db`: `createDb(url: string): { db: Database; close(): Promise<void> }` (drizzle-orm/node-postgres + `pg` Pool), `type Database`, `type DbExecutor = Database | Parameters<Parameters<Database['transaction']>[0]>[0]`, all tables, `schema` object.
- Produces from `apps/api/src/config/env.ts`: `loadEnv(source: NodeJS.ProcessEnv): Env` — Zod: `NODE_ENV` enum development|production|test (default development), `PORT` coerce int default 3020, `DATABASE_URL` url, `APP_ORIGIN` url, `BETTER_AUTH_SECRET` min 32, `PASSKEY_RP_ID` min 1, `LOG_LEVEL` enum default info, `WEB_DIST_DIR` optional string. Throws a readable error listing invalid keys.
- Produces from `apps/api/src/auth/auth.ts`: `createAuth(input: { db: Database; env: Env }): Auth` and `type Auth = ReturnType<typeof betterAuth>` (narrowed to the configured instance).

Better Auth configuration (pin, verify each option name in the docs):
- `database: drizzleAdapter(db, { provider: 'pg', schema })` from `better-auth/adapters/drizzle`
- `baseURL: env.APP_ORIGIN`, `basePath: '/api/auth'`, `secret: env.BETTER_AUTH_SECRET`, `trustedOrigins: [env.APP_ORIGIN]`
- `emailAndPassword: { enabled: true, minPasswordLength: 10, maxPasswordLength: 128, autoSignIn: false }`
- `user.additionalFields.homeLeagueId: { type: 'string', required: false, input: false }`
- `session: { cookieCache: { enabled: false } }` (revocation must be immediate)
- `plugins: [username({ minUsernameLength: 3, maxUsernameLength: 24 }), passkey({ rpID: env.PASSKEY_RP_ID, rpName: 'Storix', origin: env.APP_ORIGIN })]` — `username` from `better-auth/plugins`, `passkey` from `@better-auth/passkey`
- `rateLimit: { enabled: true, window: 60, max: 100, customRules: { '/sign-in/username': { window: 60, max: 5 }, '/change-password': { window: 60, max: 5 } } }`
- `advanced.ipAddress.ipAddressHeaders: ['x-forwarded-for']` (Railway proxy)

Tables (Drizzle, snake_case columns, `timestamp(..., { withTimezone: true })`):
- `auth.ts`: generated by the Better Auth CLI (`user`, `session`, `account`, `verification`, `passkey`, username fields). After generation, edit the `homeLeagueId` column to `uuid('home_league_id').references(() => leagues.id, { onDelete: 'set null' })`. Treat this file as source from then on; README documents re-applying the edit after a regeneration.
- `leagues.ts`: `leagueRole = pgEnum('league_role', LEAGUE_ROLES)`; `leagues { id uuid pk defaultRandom, name text not null, created_at not null default now }`; `league_members { league_id uuid fk leagues cascade, user_id text fk user cascade, role league_role not null, joined_at not null default now, pk(league_id, user_id) }`, index on `user_id`, unique partial index `league_members_one_owner` on `(league_id) where role = 'owner'`.
- `invitations.ts`: `invitations { id uuid pk, league_id fk cascade, created_by text fk user set null, token_hash text unique not null, expires_at not null, max_uses int not null, uses int not null default 0, revoked_at null, created_at }`, check `uses <= max_uses`, index on `league_id`.
- `reset-codes.ts`: `password_reset_codes { id uuid pk, user_id text fk user cascade, issued_by text fk user set null, code_hash text not null, expires_at not null, used_at null, failed_attempts int not null default 0, created_at }`, index on `user_id`.
- `audit-log.ts`: `AUDIT_ACTIONS = ['league.created','invitation.created','invitation.revoked','member.joined','member.role_changed','member.removed','reset_code.issued','reset_code.redeemed','reset_code.failed'] as const`; `audit_log { id uuid pk, league_id uuid fk leagues set null, actor_id text fk user set null, target_user_id text fk user set null, action text $type<AuditAction> not null, metadata jsonb not null default {}, created_at }`, index `(league_id, created_at desc)`.

- [ ] **Step 1: Packages.** `@storix/db` (deps drizzle-orm, pg, @storix/shared; dev drizzle-kit, @types/pg; exports `./src/index.ts`; scripts `generate: drizzle-kit generate`, `migrate: drizzle-kit migrate`, `studio`). `drizzle.config.ts`: dialect postgresql, schema `./src/schema/index.ts`, out `./drizzle`, url from `DATABASE_URL`, loading the root `.env` with `process.loadEnvFile` only when the file exists. `@storix/api` (deps fastify, better-auth, @better-auth/passkey, zod, @storix/shared, @storix/db; dev tsx).
- [ ] **Step 2: App tables + client + env + `createAuth`** per the pins above. `auth.cli.ts` exports `auth = createAuth({ db: createDb(env.DATABASE_URL).db, env: loadEnv(process.env) })` for the CLI only.
- [ ] **Step 3: Generate auth schema.** Run the Better Auth CLI (current name per docs, `pnpm dlx auth@latest generate` on 2026-11-07) with `--config apps/api/src/auth/auth.cli.ts --output packages/db/src/schema/auth.ts`, then apply the `homeLeagueId` FK edit.
- [ ] **Step 4: Migration.** `pnpm db:generate && pnpm db:migrate`.
- [ ] **Step 5: Verify.**
  Run: `docker compose exec postgres psql -U storix -d storix -c '\dt'`
  Expected: tables `account`, `audit_log`, `invitations`, `league_members`, `leagues`, `passkey`, `password_reset_codes`, `session`, `user`, `verification` (plus drizzle's migrations table). `\d "user"` shows `username`, `display_username`, `home_league_id` with FK to `leagues`. `pnpm lint && pnpm typecheck` clean.
- [ ] **Step 6: Commit** (after go-ahead): `feat(db): add drizzle schema, better auth tables and first migration`

---

### Task 5: API skeleton (errors, logging, security hooks, health, Portly)

**Files:**
- Create: `apps/api/src/{server,app,deps}.ts`, `apps/api/src/lib/{errors,logger,transaction}.ts`, `apps/api/src/http/{error-handler,origin-check,rate-limit}.ts`, `apps/api/src/features/health/{health.routes,health.service,health.repository}.ts`

**Interfaces:**
- Consumes: `loadEnv`, `createDb`, `createAuth` (Task 4), `apiErrorSchema`, `ErrorCode` (Task 3).
- Produces:
  - `class AppError extends Error { constructor(code: ErrorCode, status: number, message: string, details?: Record<string, unknown>) }` plus helpers `notFound()`, `forbidden()`, `unauthenticated()` in `lib/errors.ts`
  - `runInTransaction<T>(db: Database, fn: (tx: DbExecutor) => Promise<T>): Promise<T>` in `lib/transaction.ts`
  - `interface AppDeps { env: Env; db: Database; auth: AuthGateway; clock: () => Date }` and `interface Services { ... }` (each later task adds its service) in `deps.ts`; `buildServices(deps: AppDeps): Services`
  - `buildApp(deps: AppDeps): Promise<FastifyInstance>` in `app.ts`
  - `rateLimits` constants in `http/rate-limit.ts`: `auth: { max: 60, timeWindow: '1 minute' }`, `invitationPublic: { max: 10, timeWindow: '1 minute' }`, `invitationCreate: { max: 20, timeWindow: '1 hour' }`, `resetRedeem: { max: 5, timeWindow: '15 minutes' }`, `resetIssue: { max: 10, timeWindow: '1 hour' }`
- `AuthGateway` is defined in Task 6; until then `deps.ts` builds the raw Better Auth instance only.

- [ ] **Step 1: Logger.** Fastify's built-in pino logger: `level: env.LOG_LEVEL`, `pino-pretty` transport only in development, redact `req.headers.cookie` and `req.headers.authorization`.
- [ ] **Step 2: App.** `buildApp`: Fastify with `trustProxy: true` in production, `setValidatorCompiler`/`setSerializerCompiler` from `fastify-type-provider-zod` (`withTypeProvider<ZodTypeProvider>()`), `@fastify/rate-limit` with `global: false` and an `errorResponseBuilder` producing `{ error: { code: 'RATE_LIMITED', ... } }` with status 429, `@fastify/helmet` (default CSP `default-src 'self'`, `img-src 'self' data: blob:`), then the origin check, then an `onSend` hook that sets `Cache-Control: no-store` on `/api/*` responses only (so the Railway CDN never caches API data; it must not touch other prefixes), then feature routes under `/api`. No `@fastify/cors`. Helmet must not add `Cache-Control` or cookies.
- [ ] **Step 3: Error handler.** `setErrorHandler`: `AppError` → its status and `{ error: { code, message, details } }`; Zod/Fastify validation errors → 400 `VALIDATION_FAILED` with `details.issues`; 429 passthrough; anything else → log at `error` with the request id and return 500 `INTERNAL_ERROR` without internals. `setNotFoundHandler` for `/api/*` → 404 `NOT_FOUND`.
- [ ] **Step 4: Origin check.** `onRequest` hook in `http/origin-check.ts`: for `POST|PUT|PATCH|DELETE` on `/api/*`, the `Origin` header must equal `env.APP_ORIGIN`; otherwise 403 `CSRF_ORIGIN_MISMATCH`. Combined with Better Auth's SameSite=Lax cookies this is the CSRF protection.
- [ ] **Step 5: Health feature.** `GET /api/health` → `{ status: 'ok', db: 'ok' }`; repository `pingDatabase(db): Promise<void>` runs `select 1`; on failure the service throws `AppError('INTERNAL_ERROR', 503, ...)`.
- [ ] **Step 6: `server.ts`.** Load env, create db, build app, `listen({ port: env.PORT, host: '0.0.0.0' })`, close db and app on `SIGTERM`/`SIGINT`. Script `dev: tsx watch --env-file=../../.env src/server.ts`.
- [ ] **Step 7: Register with Portly.** `portly status --json`; add project if absent: `portly add-project --name storix --path "$(git rev-parse --show-toplevel)" --icon square.stack.3d.up --color '#A78BFA' --json`; `portly port 3020 --json` must show no occupant; `portly add-server --project storix --name api --command 'pnpm --filter @storix/api dev' --port 3020 --start --json`; poll `portly status --json` until `storix/api` is running and healthy.
- [ ] **Step 8: Verify.**
  - `curl -s localhost:3020/api/health` → `{"status":"ok","db":"ok"}`
  - `curl -s -o /dev/null -w '%{http_code}' -X POST localhost:3020/api/health` → `403` (no Origin)
  - `curl -s localhost:3020/api/nope` → `{"error":{"code":"NOT_FOUND",...}}`
  - `portly logs storix/api --tail 50 --json` shows pino lines, no stack traces.
- [ ] **Step 9: Commit** (after go-ahead): `feat(api): add fastify skeleton with error handling, origin check and health`

---

### Task 6: Better Auth mount, auth gateway, session guard

**Files:**
- Create: `apps/api/src/auth/auth.gateway.ts`, `apps/api/src/auth/auth.routes.ts`, `apps/api/src/http/authenticate.ts`
- Create: `apps/api/src/features/users/users.repository.ts`
- Modify: `apps/api/src/deps.ts`, `apps/api/src/app.ts`

**Interfaces:**
- Consumes: `createAuth`, `AppError`, `rateLimits.auth`.
- Produces:
  - `interface AuthSession { userId: string; username: string; displayUsername: string }`
  - `interface AuthGateway { handle(request: Request): Promise<Response>; getSession(headers: Headers): Promise<AuthSession | null>; createCredentialUser(input: { username: string; password: string }): Promise<{ userId: string }>; deleteUser(userId: string): Promise<void>; setPassword(userId: string, password: string): Promise<void>; revokeAllSessions(userId: string): Promise<void> }`
  - `createAuthGateway(auth: Auth): AuthGateway`
  - `authenticate` preHandler (in `http/authenticate.ts`) that sets `request.authSession: AuthSession` or throws `unauthenticated()`; Fastify module augmentation `FastifyRequest.authSession`.
  - `users.repository.ts`: `findUserByUsername(db: DbExecutor, username: string): Promise<{ id: string; homeLeagueId: string | null; displayUsername: string } | null>` (compares on the lowercase `username` column), `setHomeLeagueIfUnset(db: DbExecutor, userId: string, leagueId: string): Promise<void>`

Gateway pins (verified against Better Auth sources on 2026-11-07, re-check at install):
- `handle` → `auth.handler(request)`
- `getSession` → `auth.api.getSession({ headers })`
- `createCredentialUser` → `auth.api.signUpEmail({ body: { email: \`${randomUUID()}@users.storix.invalid\`, name: username, username, password } })`; map the username plugin's "username already taken" API error to `AppError('USERNAME_TAKEN', 409, ...)`. The synthetic email is never shown or used.
- `setPassword` → `const ctx = await auth.$context; await ctx.internalAdapter.updatePassword(userId, await ctx.password.hash(password))`
- `revokeAllSessions` → `(await auth.$context).internalAdapter.deleteUserSessions(userId)`
- `deleteUser` → `(await auth.$context).internalAdapter.deleteUser(userId)`

- [ ] **Step 1: Gateway** per pins.
- [ ] **Step 2: Mount** in `auth.routes.ts`: `app.route({ method: ['GET', 'POST'], url: '/api/auth/*', config: { rateLimit: rateLimits.auth }, handler })`. The handler builds a Fetch `Request` from `request.url` + `APP_ORIGIN`, `fromNodeHeaders(request.headers)` (`better-auth/node`) and `JSON.stringify(request.body)` when present, calls `gateway.handle`, then copies status, headers (keep multiple `set-cookie`) and body to the reply. Before forwarding, reject with 404 `NOT_FOUND` any path starting with `/api/auth/sign-up`, `/api/auth/request-password-reset`, `/api/auth/reset-password`, `/api/auth/change-email`, `/api/auth/send-verification-email`, `/api/auth/verify-email` (no public signup, no email flows).
- [ ] **Step 3: `authenticate` preHandler** using `gateway.getSession(fromNodeHeaders(...))` — keep the `better-auth/node` import inside `auth.gateway.ts` by exposing `getSessionFromNodeHeaders(headers: IncomingHttpHeaders)` there if the lint rule for `http/**` forbids it.
- [ ] **Step 4: Verify** (server restarts via Portly's `tsx watch`):
  - `curl -s -o /dev/null -w '%{http_code}' -X POST -H 'Origin: http://localhost:5180' -H 'Content-Type: application/json' -d '{}' localhost:3020/api/auth/sign-up/email` → `404`
  - `curl -s localhost:3020/api/auth/get-session` → `null`
  - `curl -s -X POST -H 'Origin: http://localhost:5180' -H 'Content-Type: application/json' -d '{"username":"ghost","password":"wrongpassword"}' localhost:3020/api/auth/sign-in/username -w ' %{http_code}'` → error body and `401`
  - Repeat the last call 6 times within a minute → the 6th returns `429`.
- [ ] **Step 5: Commit** (after go-ahead): `feat(api): mount better auth with username and passkey plugins`

---

### Task 7: Leagues, membership guard, `/api/me`, audit log, bootstrap CLI

**Files:**
- Create: `apps/api/src/features/leagues/{leagues.routes,leagues.service,leagues.repository}.ts`, `apps/api/src/features/members/members.repository.ts`, `apps/api/src/features/me/{me.routes,me.service}.ts`, `apps/api/src/features/audit/audit.repository.ts`, `apps/api/src/http/league-guard.ts`, `apps/api/src/cli/bootstrap.ts`
- Modify: `apps/api/src/deps.ts`, `apps/api/src/app.ts`, `apps/api/package.json` (script `bootstrap: tsx --env-file=../../.env src/cli/bootstrap.ts`)

**Interfaces:**
- Consumes: `authenticate`, `AuthGateway`, `runInTransaction`, `hasRoleAtLeast`, `canManageInvitations`, `LeagueSummary`, `LeagueDetail`.
- Produces:
  - `leagues.repository.ts`: `insertLeague(db, name: string): Promise<{ id: string; name: string }>`, `findLeagueById(db, id): Promise<{ id; name } | null>`, `listLeaguesForUser(db, userId): Promise<LeagueSummary[]>`, `countMembers(db, leagueId): Promise<number>`, `findOwnerId(db, leagueId): Promise<string | null>`
  - `members.repository.ts`: `insertMember(db, input: { leagueId; userId; role: LeagueRole }): Promise<void>`, `findMembership(db, leagueId, userId): Promise<{ role: LeagueRole; joinedAt: Date } | null>`
  - `audit.repository.ts`: `insertAuditEntry(db, entry: { leagueId: string | null; actorId: string | null; targetUserId: string | null; action: AuditAction; metadata?: Record<string, unknown> }): Promise<void>`
  - `leaguesService`: `createLeague(userId: string, name: string): Promise<LeagueSummary>` (transaction: insert league, insert owner membership, audit `league.created`), `getLeagueDetail(leagueId: string, membership: Membership): Promise<LeagueDetail>`, `getMembership(leagueId, userId): Promise<Membership | null>`
  - `type Membership = { leagueId: string; userId: string; role: LeagueRole }`
  - `league-guard.ts`: `requireLeagueRole(min: LeagueRole)` preHandler factory: reads `params.leagueId`, calls `services.leagues.getMembership`; non-member → 404 `NOT_FOUND` (do not reveal league existence); member below `min` → 403 `FORBIDDEN`; sets `request.membership: Membership`.
  - `meService.getMe(session: AuthSession): Promise<MeResponse>`
  - `bootstrap.ts`: `pnpm --filter @storix/api bootstrap -- --username <name> --league <name>`, password read from env `BOOTSTRAP_PASSWORD` (never a CLI argument). Creates the user via `gateway.createCredentialUser`, the league with the user as owner, and sets the user's home league to it. Prints the user id and league id through the pino logger. Refuses to run if the username exists.

Routes (all behind `authenticate`, outputs validated with the shared schemas):
- `GET /api/me` → `MeResponse`
- `POST /api/leagues` body `createLeagueBodySchema` → 201 `LeagueSummary`
- `GET /api/leagues/:leagueId` (guard `member`) → `LeagueDetail` (`canManageInvitations` from domain, `canManageMembers` = `hasRoleAtLeast(role,'admin')`)

- [ ] **Step 1: Implement** repositories, services, guard, routes, CLI per Interfaces.
- [ ] **Step 2: Verify.**
  - `BOOTSTRAP_PASSWORD='bootstrap-pass-1' pnpm --filter @storix/api bootstrap -- --username tristan --league "Les potes"` → logs user id and league id.
  - Sign in and keep cookies: `curl -s -c /tmp/storix-a.txt -H 'Origin: http://localhost:5180' -H 'Content-Type: application/json' -d '{"username":"tristan","password":"bootstrap-pass-1"}' localhost:3020/api/auth/sign-in/username` → JSON with the user.
  - `curl -s -b /tmp/storix-a.txt localhost:3020/api/me` → one league, role `owner`, memberCount 1.
  - `curl -s -b /tmp/storix-a.txt -H 'Origin: http://localhost:5180' -H 'Content-Type: application/json' -d '{"name":"Ski 2027"}' localhost:3020/api/leagues -w ' %{http_code}'` → league JSON `201`.
  - `GET /api/leagues/<random uuid>` with cookies → 404; without cookies → 401.
  - `psql ... -c 'select action from audit_log'` → two `league.created` rows.
- [ ] **Step 3: Commit** (after go-ahead): `feat(api): add leagues, membership guard, me endpoint and bootstrap cli`

---

### Task 8: Invitations (create, list, revoke, preview, signup, accept)

**Files:**
- Create: `apps/api/src/features/invitations/{invitations.routes,invitations.service,invitations.repository}.ts`, `apps/api/src/lib/crypto.ts`
- Modify: `apps/api/src/deps.ts`, `apps/api/src/app.ts`

**Interfaces:**
- Consumes: `evaluateInvitation`, `invitationExpiry`, `canManageInvitations`, `requireLeagueRole`, `insertMember`, `findMembership`, `setHomeLeagueIfUnset`, `findUserByUsername`, `insertAuditEntry`, `AuthGateway.createCredentialUser/deleteUser`.
- Produces:
  - `lib/crypto.ts`: `generateInvitationToken(): string` (32 random bytes, base64url, 43 chars), `generateResetCode(): string` (10 chars drawn with `crypto.randomInt` from `RESET_CODE_ALPHABET`), `sha256Hex(value: string): string`, `safeEqualHex(a: string, b: string): boolean` (`timingSafeEqual`)
  - repository: `insertInvitation(db, input: { leagueId; createdBy; tokenHash; expiresAt; maxUses }): Promise<InvitationRow>`, `listActiveInvitations(db, leagueId, now: Date): Promise<InvitationRow[]>` (not revoked, not expired), `findInvitationByTokenHash(db, tokenHash): Promise<(InvitationRow & { leagueName: string; createdByName: string | null }) | null>`, `revokeInvitation(db, leagueId, invitationId, now): Promise<boolean>`, `consumeInvitationUse(db, invitationId, now): Promise<boolean>` — single `UPDATE invitations SET uses = uses + 1 WHERE id = $1 AND revoked_at IS NULL AND expires_at > $now AND uses < max_uses RETURNING id`; true when a row came back.
  - service: `createInvitation(m: Membership, body: CreateInvitationBody): Promise<CreateInvitationResponse>` (url = `${APP_ORIGIN}/join/${token}`; token is returned once and never stored in clear), `listInvitations(m): Promise<InvitationSummary[]>`, `revokeInvitation(m, invitationId): Promise<void>`, `previewInvitation(token: string, viewerId: string | null): Promise<InvitationPreview>`, `signupWithInvitation(token: string, body: SignupBody): Promise<JoinResponse>`, `acceptInvitation(token: string, userId: string): Promise<JoinResponse>`

Signup algorithm (pinned because the race and the compensation are not obvious):
1. Look up by `sha256Hex(token)`; `evaluateInvitation` ≠ `valid` → `AppError('INVITATION_INVALID', 410, ..., { status })`.
2. `findUserByUsername` hit → `USERNAME_TAKEN` 409.
3. `gateway.createCredentialUser` → `userId`.
4. Transaction: `consumeInvitationUse` (false → throw `INVITATION_INVALID` with status `exhausted`), `insertMember(role 'member')`, `setHomeLeagueIfUnset(userId, leagueId)`, audit `member.joined` (metadata `{ invitationId, via: 'signup' }`).
5. If step 4 throws, `gateway.deleteUser(userId)` then rethrow.
The client signs in afterwards with `signIn.username` (no session is created here; `autoSignIn` is false).

Accept algorithm: same lookup and status check; already a member → 409 `ALREADY_MEMBER`; transaction: consume, insert member, audit (`via: 'accept'`). The home league is NOT changed on accept.

Routes:
- `GET /api/leagues/:leagueId/invitations` (guard `admin`) → `InvitationSummary[]`
- `POST /api/leagues/:leagueId/invitations` (guard `admin`, `rateLimits.invitationCreate`) → 201 `CreateInvitationResponse`
- `DELETE /api/leagues/:leagueId/invitations/:invitationId` (guard `admin`) → 204
- `GET /api/invitations/:token` (session optional, `rateLimits.invitationPublic`) → `InvitationPreview`
- `POST /api/invitations/:token/signup` (no session, `rateLimits.invitationPublic`) → 201 `JoinResponse`
- `POST /api/invitations/:token/accept` (`authenticate`, `rateLimits.invitationPublic`) → 200 `JoinResponse`

- [ ] **Step 1: Implement** crypto helpers, repository, service, routes.
- [ ] **Step 2: Verify** (cookies of `tristan` in `/tmp/storix-a.txt`; `H='-H Origin:http://localhost:5180 -H Content-Type:application/json'`):
  - Create a 2-use invite on the bootstrap league → 201 with `url` ending in a 43-char token. `psql -c 'select token_hash from invitations'` shows a 64-hex hash, not the token.
  - `GET /api/invitations/<token>` without cookies → `status: "valid"`, league name, `invitedBy: "tristan"`, `isMember: false`.
  - Signup `max` / `password-max-1` → 201; sign in as `max` → 200; `/api/me` for max shows the league as `member`; `psql -c "select home_league_id from \"user\" where username='max'"` = the league id.
  - Signup `Max` with the same token → 409 `USERNAME_TAKEN`; signing in as `MAX` works (Review Focus 2).
  - Race (Review Focus 1): create a 1-use invite, then `printf 'lea\nines\n' | xargs -P 2 -I{} curl -s -X POST $H -d '{"username":"{}","password":"password-123x"}' localhost:3020/api/invitations/<token>/signup` → exactly one 201 and one 410; `psql -c 'select count(*) from "user"'` shows only one new user (the loser was deleted).
  - Revoke an invite → preview returns `status: "revoked"`, `league: null`.
  - Accept with tristan's cookies on an invite to his own league → 409 `ALREADY_MEMBER`.
- [ ] **Step 3: Commit** (after go-ahead): `feat(api): add invitation links with invite-only signup and accept`

---

### Task 9: Members and roles

**Files:**
- Create: `apps/api/src/features/members/{members.routes,members.service}.ts`
- Modify: `apps/api/src/features/members/members.repository.ts`, `apps/api/src/deps.ts`, `apps/api/src/app.ts`

**Interfaces:**
- Consumes: `canChangeRole`, `canRemoveMember`, `canIssueResetCode`, `requireLeagueRole`, `findOwnerId`, `insertAuditEntry`.
- Produces:
  - repository additions: `listMembers(db, leagueId): Promise<Array<{ userId; displayUsername; role; joinedAt; homeLeagueId: string | null }>>`, `updateMemberRole(db, leagueId, userId, role): Promise<void>`, `deleteMember(db, leagueId, userId): Promise<void>`
  - `membersService.listMembers(m: Membership): Promise<MemberSummary[]>` — computes `isSelf`, `canChangeRole` (true if any `nextRole` in admin|member is allowed), `canRemove`, `canIssueResetCode` (via `canIssueResetCode` with `homeLeagueOwnerId` = owner of the member's home league, `targetIsHomeLeagueMember` = true when home league = this league since the row exists here)
  - `membersService.changeRole(m, targetUserId, nextRole): Promise<void>` (domain check → 403 `FORBIDDEN`; audit `member.role_changed` with `{ from, to }`)
  - `membersService.removeMember(m, targetUserId): Promise<void>` (domain check; delete; audit `member.removed`). Plan 4 adds card side effects.

Routes: `GET /api/leagues/:leagueId/members` (guard `member`) → `MemberSummary[]` sorted owner, admins, members, then by name; `PATCH /api/leagues/:leagueId/members/:userId` (guard `admin`) body `updateMemberRoleBodySchema` → 204; `DELETE /api/leagues/:leagueId/members/:userId` (guard `admin`) → 204. Unknown target → 404.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify:** as tristan, list members → max has `canChangeRole: true, canRemove: true, canIssueResetCode: true`, tristan has `isSelf: true` and all flags false; promote max to admin → 204; as max (admin) PATCH tristan → 403; as max DELETE another member → 204; as max DELETE tristan → 403; audit_log has `member.role_changed` and `member.removed`.
- [ ] **Step 3: Commit** (after go-ahead): `feat(api): add member listing, role changes and removal`

---

### Task 10: Reset codes (issue and redeem)

**Files:**
- Create: `apps/api/src/features/reset-codes/{reset-codes.routes,reset-codes.service,reset-codes.repository}.ts`
- Modify: `apps/api/src/deps.ts`, `apps/api/src/app.ts`

**Interfaces:**
- Consumes: `canIssueResetCode`, `resetCodeExpiry`, `isResetCodeRedeemable`, `normalizeResetCode`, `formatResetCode`, `generateResetCode`, `sha256Hex`, `safeEqualHex`, `findUserByUsername`, `findMembership`, `findOwnerId`, `AuthGateway.setPassword/revokeAllSessions`, `insertAuditEntry`.
- Produces:
  - repository: `deleteUnusedCodes(db, userId): Promise<void>`, `insertResetCode(db, input: { userId; issuedBy; codeHash; expiresAt }): Promise<void>`, `findLatestUnusedCode(db, userId): Promise<{ id; codeHash; expiresAt; usedAt: Date | null; failedAttempts: number } | null>`, `incrementFailedAttempts(db, id): Promise<void>`, `markCodeUsed(db, id, now): Promise<boolean>` (conditional on `used_at IS NULL`)
  - `resetCodesService.issue(m: Membership, targetUserId: string): Promise<IssueResetCodeResponse>` — loads the target's home league, its owner, and whether the target is a member of it; `canIssueResetCode`; denied → 403 `RESET_NOT_ALLOWED` with `details.reason`; else transaction: delete previous unused codes, insert hash of the new code, audit `reset_code.issued`. Returns `formatResetCode(code)` once.
  - `resetCodesService.redeem(body: RedeemResetCodeBody): Promise<void>`: unknown user, no code, not redeemable, or hash mismatch → the same 400 `INVALID_RESET_CODE` (no enumeration); on mismatch also `incrementFailedAttempts` and audit `reset_code.failed`. On match: `markCodeUsed` (false → `INVALID_RESET_CODE`), then `gateway.setPassword`, then `gateway.revokeAllSessions`, then audit `reset_code.redeemed`.

Routes: `POST /api/leagues/:leagueId/members/:userId/reset-code` (guard `owner`, `rateLimits.resetIssue`) → 201 `IssueResetCodeResponse`; `POST /api/reset-codes/redeem` (no session, `rateLimits.resetRedeem`) → 204.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify:**
  - As tristan (owner of max's home league) issue for max → 201 `{ code: "XXXXX-XXXXX", expiresAt: +24h }`; `psql` shows only a hash.
  - Ski 2027 league (tristan owner, max invited there later): issue for max in that league → 403 `RESET_NOT_ALLOWED` reason `OTHER_LEAGUE`.
  - Sign max in on two cookie jars (`/tmp/storix-m1.txt`, `/tmp/storix-m2.txt`). Redeem with the code typed lowercase without the dash and a new password → 204 (Review Focus 3). Then `curl -b /tmp/storix-m2.txt localhost:3020/api/me` → 401 (Review Focus 4). Old password sign-in → 401, new one → 200.
  - Redeem the same code again → 400 `INVALID_RESET_CODE`. Unknown username → identical 400 body.
  - Issue a new code, send 5 wrong codes → the 6th try with the right code → 400 (5 attempts burned; also hits the 5 / 15 min rate limit → 429, either is acceptable).
- [ ] **Step 3: Commit** (after go-ahead): `feat(api): add admin-issued single-use password reset codes`

---

### Task 11: Web scaffold, design A tokens, UI primitives, app shell

**Files:**
- Create: `apps/web/{package.json,tsconfig.json,index.html,vite.config.ts}`, `apps/web/src/{main.tsx,router.tsx}`, `apps/web/src/styles/app.css`, `apps/web/src/lib/{http,auth-client,logger,query-client,storage}.ts`, `apps/web/src/components/ui/*.tsx`, `apps/web/src/features/errors/error-messages.ts`, `apps/web/src/features/auth/{auth.api.ts,session.queries.ts}`, `apps/web/src/features/leagues/{leagues.api.ts,leagues.queries.ts}`, `apps/web/src/routes/{__root,_authed}.tsx`, `apps/web/src/routes/_authed/{index,l.$leagueId,l.$leagueId.index,l.$leagueId.collection,l.$leagueId.add}.tsx`

**Interfaces:**
- Consumes: shared schemas (`meResponseSchema`, `apiErrorSchema`, `leagueDetailSchema`, `ErrorCode`).
- Produces:
  - `lib/http.ts`: `class ApiError extends Error { code: ErrorCode; status: number; details?: Record<string, unknown> }`; `apiRequest<T>(path: string, options: { method?: 'GET'|'POST'|'PATCH'|'DELETE'; body?: unknown; schema: z.ZodType<T> }): Promise<T>`; `apiRequestVoid(path, options: { method; body? }): Promise<void>` — `credentials: 'same-origin'`, JSON body, error bodies parsed with `apiErrorSchema` (fallback `INTERNAL_ERROR`).
  - `lib/auth-client.ts`: `authClient = createAuthClient({ plugins: [usernameClient(), passkeyClient()] })` (`better-auth/react`, `better-auth/client/plugins`, `@better-auth/passkey/client`), same-origin base path `/api/auth`.
  - `lib/logger.ts`: `logger.{debug,info,warn,error}(message: string, context?: Record<string, unknown>)`; debug/info silenced in production.
  - `lib/storage.ts`: `readStorage(key: string): string | null`, `writeStorage(key: string, value: string): void` (try/catch, log on failure). Keys: `storix.lastLeagueId`, `storix.passkeyPromptDismissed.<userId>`, `storix.iosHintDismissed`.
  - `lib/query-client.ts`: `createQueryClient(onUnauthenticated: () => void): QueryClient` — `QueryCache`/`MutationCache` `onError`: `ApiError` with status 401 → `onUnauthenticated()`; `retry` false on 4xx.
  - `features/leagues/leagues.queries.ts`: `leagueDetailQueryOptions(leagueId: string)` (key `['leagues', leagueId]`, GET `/api/leagues/:leagueId`, parsed with `leagueDetailSchema`).
  - `features/auth/session.queries.ts`: `meQueryOptions = queryOptions({ queryKey: ['me'], queryFn })` returning `MeResponse | null` (null on 401).
  - `features/errors/error-messages.ts`: `errorMessage(code: ErrorCode): string` (French, e.g. `USERNAME_TAKEN` → "Ce pseudo est déjà pris.", `INVITATION_INVALID` → "Ce lien d'invitation n'est plus valide.", `INVALID_RESET_CODE` → "Code invalide ou expiré.", `RATE_LIMITED` → "Trop de tentatives, réessaie dans quelques minutes.", `INTERNAL_ERROR` → "Une erreur est survenue.", others with equivalent French).
  - UI components (presentational, props only): `Button { variant: 'primary' | 'ghost'; block?: boolean; isLoading?: boolean } & ButtonHTMLAttributes`, `Input`, `Field { label: string; error?: string; children }`, `Icon { name: 'home'|'collection'|'plus'|'trade'|'profile'|'close'|'back'|'share'|'dust' }`, `TopBar { title?: string; start?: ReactNode; end?: ReactNode }`, `BottomNav { leagueId: string; active: 'home'|'collection'|'add'|'profile' }`, `EmptyState { icon: IconName; title: string; body: string; action?: ReactNode }`, `Dialog { open; title; onClose; children }` (native `<dialog>`), `Avatar { label: string; size?: 'sm'|'md' }` (initials), `Notice { tone: 'info'|'error'; children }`.
  - Router context: `{ queryClient: QueryClient }`; `_authed.tsx` `beforeLoad` ensures `meQueryOptions`, null → `redirect({ to: '/login', search: { redirect: location.href } })`.

Design tokens — `app.css` (`@import "tailwindcss";` then `@theme`), values copied from the mockup:

```css
@theme {
  --color-board: #050508; --color-bg: #0A0A10; --color-surface: #15151E; --color-surface-2: #1E1E2A;
  --color-nav: #0F0F17; --color-line: #2A2A3A; --color-line-strong: #34344A; --color-line-nav: #20202E;
  --color-ink: #F2F2F7; --color-ink-2: #D4D4E0; --color-ink-3: #C9C9DA; --color-muted: #9A9AB0; --color-faint: #8A8AA0;
  --color-accent: #A78BFA; --color-accent-hover: #C4B5FD; --color-cyan: #22D3EE;
  --color-tier-common: #A1A1AA; --color-tier-uncommon: #4ADE80; --color-tier-rare: #60A5FA; --color-tier-epic: #C084FC;
  --color-tier-legendary: #FBBF24; --color-tier-legendary-soft: #FCD34D; --color-locked: #6B6B80;
  --font-display: "Space Grotesk Variable", "Space Grotesk", sans-serif;
  --font-sans: "Inter Variable", Inter, system-ui, sans-serif;
  --radius-thumb: 10px; --radius-input: 12px; --radius-control: 14px; --radius-plus: 16px; --radius-card-lg: 18px; --radius-panel: 24px;
  --shadow-hairline: inset 0 0 0 1px #2A2A3A; --shadow-hairline-strong: inset 0 0 0 1px #34344A; --shadow-nav: inset 0 1px 0 #20202E;
  --animate-shine: shine 5s linear infinite;
  @keyframes shine { 0% { background-position: 110% 0 } 100% { background-position: -110% 0 } }
}
```

Component specs from the mockup: `body` bg `--color-bg`, text ink, font-sans; screen padding `max(16px, env(safe-area-inset-top))` top, 16px sides, gap 16px, max width 480px centered. Button: height 48, px 20, radius control, display font 600 16px; primary = bg ink / text bg; ghost = transparent + hairline-strong. Input: height 44, radius input, bg surface, hairline-strong, Inter 500 15px, px 12. Field label: 12px uppercase, tracking .06em, muted. TopBar: min-height 44, title display 600 15px ink-3; icon buttons 44×44 radius control bg surface + hairline. h1: display 700 28px; h2: display 700 17px. BottomNav: height 84 + `env(safe-area-inset-bottom)`, bg nav, shadow-nav, items 64 wide, min-height 44, Inter 500 11px, faint, active ink; icons 24px stroke 1.8 round caps/joins, paths from the mockup (`home: M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z`, `coll: M3 5h8v14H3zM13 5h8v14h-8z`, `plus: M12 5v14M5 12h14`, `trade: M4 8h14l-4-4M20 16H6l4 4`, `me: M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0`); plus item = 48×48 tile radius plus, bg accent, icon color bg, margin-top -6, label visually hidden, `aria-label="Ajouter des photos"`. Échanges: rendered as a non-interactive item, `aria-disabled="true"`, opacity .4, label "Échanges" and a 9px "bientôt" caption. Labels: "Accueil", "Collection", "Échanges", "Profil". Respect `prefers-reduced-motion` (disable animations).

Screens in this task:
- `_authed/index.tsx`: redirect to `storix.lastLeagueId` if it is in `me.leagues`, else the first league, else `/leagues/new`.
- `l.$leagueId.tsx` layout: loads `leagueDetailQueryOptions(leagueId)` (404/403 → redirect `/`), writes `storix.lastLeagueId`, renders `<Outlet />` + `BottomNav`.
- `l.$leagueId.index.tsx`: header (league avatar tile 44×44 radius control bg surface-2 with initials in accent-hover, name display 700 18px, meta "N membres" 13px muted) + `EmptyState` title "Les boosters arrivent bientôt" body "En attendant, invite tes potes dans la ligue." + ghost button "Inviter" to admin (only if `permissions.canManageInvitations`).
- `l.$leagueId.collection.tsx`: h1 "Collection" + `EmptyState` "Ta collection est vide" / "Les cartes arriveront ici dès l'ouverture des premiers boosters."
- `l.$leagueId.add.tsx`: `EmptyState` "Ajout de photos bientôt" / "Tu pourras bientôt transformer tes photos en cartes."

- [ ] **Step 1: Package + Vite config.** Deps: react, react-dom, @tanstack/react-router, @tanstack/react-query, better-auth, @better-auth/passkey, zod, @storix/shared, @fontsource-variable/space-grotesk, @fontsource-variable/inter; dev: vite, @vitejs/plugin-react, @tanstack/router-plugin, tailwindcss, @tailwindcss/vite, @serwist/vite (wired in Task 16). `vite.config.ts`: plugins `tanstackRouter({ target: 'react', autoCodeSplitting: true })` BEFORE `react()`, then `tailwindcss()`; alias `@` → `src`; `server: { port: Number(process.env.PORT ?? 5180), strictPort: true, proxy: { '/api': { target: 'http://localhost:3020', changeOrigin: false } } }`. `index.html`: `lang="fr"`, `<meta name="theme-color" content="#0A0A10">`, viewport with `viewport-fit=cover`, title "Storix".
- [ ] **Step 2: Implement** lib files, tokens, fonts import in `main.tsx`, UI components, router + routes above.
- [ ] **Step 3: Register web in Portly.** `portly port 5180 --json` (free), `portly add-server --project storix --name web --command 'pnpm --filter @storix/web dev' --port 5180 --start --json`, poll until healthy.
- [ ] **Step 4: Verify.** `pnpm lint && pnpm typecheck` clean. Browser at `http://localhost:5180/`: logged out → redirected to `/login?redirect=...` (the login screen itself arrives in Task 12, which also does the visual check of the shell). `curl -s localhost:5180/api/health` → `{"status":"ok","db":"ok"}` through the Vite proxy. Boundary check: add `import { apiRequest } from '@/lib/http'` in a component → `pnpm lint` fails; remove.
- [ ] **Step 5: Commit** (after go-ahead): `feat(web): add vite app shell with design tokens, router and bottom nav`

---

### Task 12: Public screens — login, join, reset redeem

**Files:**
- Create: `apps/web/src/routes/{login,join.$token,reset}.tsx`, `apps/web/src/features/auth/{use-login.ts,components/login-form.tsx}`, `apps/web/src/features/invitations/{invitations.api.ts,invitations.queries.ts,use-signup.ts,use-accept-invitation.ts,components/join-preview.tsx,components/signup-form.tsx}`, `apps/web/src/features/reset-codes/{reset-codes.api.ts,use-redeem-reset-code.ts,components/redeem-form.tsx}`

**Interfaces:**
- Consumes: `apiRequest`, `authClient`, `meQueryOptions`, `errorMessage`, UI components, shared schemas.
- Produces:
  - `useLogin(): { loginWithPassword(input: { username: string; password: string }): Promise<void>; loginWithPasskey(): Promise<void>; isPending: boolean; error: string | null }` — `authClient.signIn.username`, `authClient.signIn.passkey`; on success invalidate `['me']`.
  - `invitationPreviewQueryOptions(token: string)`
  - `useSignup(token)`: `mutateAsync({ username, password })` → POST signup, then `authClient.signIn.username`, invalidate `['me']`, navigate to `/l/$leagueId`.
  - `useAcceptInvitation(token)`: POST accept → navigate to `/l/$leagueId`.
  - `useRedeemResetCode()`: POST redeem → navigate to `/login` with search `{ reset: 'done' }`.

Screens (French copy pinned):
- `/login` (search `{ redirect?: string; reset?: 'done' }`, validated with Zod): logo text "STORIX" (display 700, tracking .12em), h1 "Connexion", fields "Pseudo" (`autoComplete="username webauthn"`), "Mot de passe", primary block "Se connecter", ghost block "Utiliser une passkey", link "J'ai un code de réinitialisation" → `/reset`; notice when `reset=done`: "Mot de passe modifié. Connecte-toi avec le nouveau." No signup link (invite only): footnote "Pas de compte ? Demande un lien d'invitation à un membre." After login: navigate to `redirect` if it is a same-origin path, else `/`.
- `/join/$token`: preview card (league avatar + "Tu es invité·e à rejoindre" + league name + "N membres" + "Invitation de X"). Status ≠ valid → `EmptyState` "Lien plus valide" / "Ce lien d'invitation a expiré ou a été révoqué. Demande-en un nouveau." Logged out → `SignupForm` (Pseudo, Mot de passe with hint "10 caractères minimum", primary "Créer mon compte") + ghost "J'ai déjà un compte" → `/login?redirect=/join/<token>`. Logged in and not member → primary "Rejoindre la ligue". `isMember` → primary "Ouvrir la ligue". Field errors from `usernameSchema`/`passwordSchema` before submit.
- `/reset`: h1 "Réinitialiser le mot de passe", body "Demande un code au propriétaire de ta première ligue.", fields "Pseudo", "Code" (placeholder "XXXXX-XXXXX", `autoCapitalize="characters"`), "Nouveau mot de passe", primary "Valider".

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify in the browser** (`http://localhost:5180`):
  - Login as `tristan` → lands on `/l/<id>` with header, empty state, bottom nav (Échanges dimmed with "bientôt"); compare against the mockup's nav and colors.
  - Create an invite with curl (Task 8), open `/join/<token>` in a private window → preview; sign up `sami` → lands in the league, `/api/me` lists it.
  - Open a revoked link → "Lien plus valide".
  - Issue a reset code for `sami` (curl), redeem on `/reset` typing it lowercase → back on `/login` with the notice; new password works.
  - Review Focus 5: while logged in on `/l/<id>/collection`, delete the session row (`psql -c 'delete from session'`), click "Accueil" → redirected to `/login?redirect=...`; after login you land back on the page.
- [ ] **Step 3: Commit** (after go-ahead): `feat(web): add login, invitation join and reset code screens`

---

### Task 13: Profile — passkeys, prompt after first login, password, logout, leagues

**Files:**
- Create: `apps/web/src/routes/_authed/l.$leagueId.profile.tsx`, `apps/web/src/features/auth/{use-logout.ts,use-passkeys.ts,use-change-password.ts,use-passkey-prompt.ts,components/passkey-prompt.tsx,components/passkey-list.tsx,components/change-password-form.tsx}`, `apps/web/src/features/leagues/components/league-list.tsx`
- Modify: `apps/web/src/routes/_authed/l.$leagueId.tsx` (mount `PasskeyPrompt`)

**Interfaces:**
- Consumes: `authClient`, `meQueryOptions`, `readStorage/writeStorage`, UI components.
- Produces:
  - `usePasskeys(): { passkeys: Array<{ id: string; name: string | null; createdAt: string }>; addPasskey(name: string): Promise<void>; deletePasskey(id: string): Promise<void>; isLoading: boolean }` — `authClient.passkey.listUserPasskeys`, `.addPasskey({ name })`, `.deletePasskey({ id })`, query key `['passkeys']`.
  - `usePasskeyPrompt(userId: string): { isOpen: boolean; dismiss(): void }` — open when the passkey list is empty, WebAuthn is supported (`window.PublicKeyCredential` defined), and `storix.passkeyPromptDismissed.<userId>` is unset.
  - `useChangePassword()`: `authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true })`.
  - `useLogout()`: `authClient.signOut()`, `queryClient.clear()`, navigate `/login`.

Screens:
- `PasskeyPrompt` dialog (mounted in the league layout, so it appears right after the first login): title "Connecte-toi plus vite", body "Ajoute une passkey : Face ID, Touch ID ou le code de ton téléphone suffiront.", primary "Ajouter une passkey", ghost "Plus tard" (dismiss stores the flag). Success or dismiss closes it for good on this device.
- Profile: avatar (initials of `displayUsername`) + `displayUsername`; section "Passkeys" (list with date, "Supprimer", primary "Ajouter une passkey"); section "Mot de passe" (Mot de passe actuel, Nouveau mot de passe, "Modifier"; success notice "Mot de passe modifié. Tes autres sessions ont été déconnectées."); section "Mes ligues" (`LeagueList`: each league with role label Propriétaire/Admin/Membre, link to it; ghost "Créer une ligue" → `/leagues/new`; for admins/owners of the current league a link "Administration de la ligue" → admin route); ghost block "Se déconnecter".

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify in the browser:** log in as a fresh user → prompt appears; "Ajouter une passkey" with the platform authenticator (Chrome: macOS Touch ID or DevTools > WebAuthn virtual authenticator) → listed on the profile; log out, "Utiliser une passkey" on `/login` logs in. "Plus tard" on another user → prompt does not come back after reload. Change password → sessions on a second browser profile are logged out. Logout → `/login`, back button does not show protected data.
- [ ] **Step 3: Commit** (after go-ahead): `feat(web): add profile with passkeys, password change and logout`

---

### Task 14: Create league screen

**Files:**
- Create: `apps/web/src/routes/_authed/leagues.new.tsx`, `apps/web/src/features/leagues/{use-create-league.ts,components/create-league-form.tsx}`
- Modify: `apps/web/src/features/leagues/leagues.api.ts` (add `createLeague`)

**Interfaces:**
- Consumes: `leagueDetailQueryOptions` (Task 11).
- Produces: `useCreateLeague()` → POST `/api/leagues`, invalidates `['me']`, navigates to `/l/$leagueId/admin`.

Screen: TopBar with back button, h1 "Nouvelle ligue", body "Tu en seras le propriétaire. Invite ensuite tes potes avec un lien.", field "Nom de la ligue" (2-40 caractères), primary block "Créer la ligue". No bottom nav (outside a league).

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify in the browser:** from the profile, create "Vacances 2027" → lands on its admin screen (Task 15; until then the route may 404 — acceptable, check `/l/<id>` instead); `/api/me` lists it as owner; a 1-character name shows the field error without a request.
- [ ] **Step 3: Commit** (after go-ahead): `feat(web): add create league screen`

---

### Task 15: League admin — members, roles, invitations, reset codes

**Files:**
- Create: `apps/web/src/routes/_authed/l.$leagueId.admin.tsx`, `apps/web/src/features/members/{members.api.ts,members.queries.ts,use-change-role.ts,use-remove-member.ts,components/member-list.tsx,components/member-row.tsx}`, `apps/web/src/features/invitations/{use-invitations.ts,use-create-invitation.ts,use-revoke-invitation.ts,components/invitation-list.tsx,components/create-invitation-form.tsx,components/invitation-link.tsx}`, `apps/web/src/features/reset-codes/{use-issue-reset-code.ts,components/reset-code-dialog.tsx}`

**Interfaces:**
- Consumes: member/invitation/reset routes (Tasks 8-10), `MemberSummary` permission flags (no client-side rules).
- Produces: `membersQueryOptions(leagueId)` (key `['leagues', leagueId, 'members']`), `invitationsQueryOptions(leagueId)` (key `['leagues', leagueId, 'invitations']`), mutations invalidating those keys.

Screen (route `beforeLoad`: `permissions.canManageMembers` false → redirect to `/l/$leagueId`):
- TopBar "Administration" with back. Segmented control (mockup `.seg`) "Membres" / "Invitations".
- Membres: rows with Avatar, `displayUsername`, role pill (Propriétaire / Admin / Membre), "toi" tag when `isSelf`. Row actions only when the matching flag is true: "Passer admin" / "Repasser membre", "Retirer" (confirm dialog "Retirer X de la ligue ?"), "Code de réinitialisation". Reset dialog shows the code large (display 700 28px, tabular), expiry, copy button, and "Valable 24 h, une seule fois. Transmets-le en main propre : il ne sera plus affiché."
- Invitations: form "Validité" (chips 1 jour / 7 jours / 30 jours, default 7) and "Utilisations max" (number 1-50, default 10), primary "Créer un lien". After creation, `InvitationLink` shows the URL with "Copier le lien" (`navigator.clipboard.writeText`, then "Copié !") and, when `navigator.share` exists, "Partager"; note "Ce lien ne sera plus affiché : copie-le maintenant." List of active invitations: "N / M utilisations · expire le <date fr-FR>" and "Révoquer".

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify in the browser** as tristan: create a link, copy, open it in a private window, sign up `tom` → tom appears in Membres after refocus; promote tom → pill "Admin"; as tom the admin screen shows invitations but no role actions on tristan and no reset action; as tristan issue a reset code for tom → dialog with `XXXXX-XXXXX`; revoke a link → removed from the list and its preview says "Lien plus valide"; as a plain member, `/l/<id>/admin` redirects home.
- [ ] **Step 3: Commit** (after go-ahead): `feat(web): add league admin for members, invitations and reset codes`

---

### Task 16: PWA — manifest, icons, Serwist shell, iOS install hint

**Files:**
- Create: `apps/web/public/manifest.webmanifest`, `apps/web/public/icons/icon.svg` + generated PNGs, `apps/web/src/sw.ts`, `apps/web/src/features/pwa/{register-sw.ts,use-ios-install-hint.ts,components/ios-install-hint.tsx}`, `apps/web/src/lib/platform.ts`
- Modify: `apps/web/vite.config.ts`, `apps/web/index.html`, `apps/web/tsconfig.json`, `apps/web/src/main.tsx`, `apps/web/src/routes/_authed/l.$leagueId.tsx`

**Interfaces:**
- Produces: `registerServiceWorker(): Promise<void>` (`getSerwist()` from `virtual:serwist`, then `register()`; production only), `isIosSafari(): boolean`, `isStandalone(): boolean` (`matchMedia('(display-mode: standalone)')` or `navigator.standalone === true`), `useIosInstallHint(): { isVisible: boolean; dismiss(): void }`.

Pins:
- Manifest: `name: "Storix"`, `short_name: "Storix"`, `lang: "fr"`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, `orientation: "portrait"`, `background_color: "#0A0A10"`, `theme_color: "#0A0A10"`, icons 192, 512, maskable 512. `index.html`: `<link rel="manifest">`, `apple-touch-icon` 180, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style="black-translucent"`, `apple-mobile-web-app-title="Storix"`.
- Placeholder icon `icon.svg`: 512 square, bg `#0A0A10`, rounded tile gradient `#2B1B5A → #0E3B4A` (booster pack colors), letter "S" in `#F2F2F7` Space Grotesk-like bold. Rasterize once with `pnpm dlx @vite-pwa/assets-generator --preset minimal-2023 apps/web/public/icons/icon.svg` (one-off, not a dependency).
- `vite.config.ts`: `serwist({ swSrc: 'src/sw.ts', swDest: 'sw.js', globDirectory: 'dist', injectionPoint: 'self.__SW_MANIFEST', rollupFormat: 'iife' })`. `tsconfig.json`: `types: ['@serwist/vite/typings']`; `sw.ts` uses a separate tsconfig or triple-slash lib reference for `webworker`.
- `sw.ts`: `new Serwist({ precacheEntries: self.__SW_MANIFEST, skipWaiting: true, clientsClaim: true, navigationPreload: true })` with NO `runtimeCaching` (app shell only; image and API caching come in Plan 2). Navigation requests not under `/api/` are served the precached `/index.html` (Serwist `NavigationRoute` with a handler bound to `/index.html`, `denylist: [/^\/api\//]` — verify the v9 API names).
- iOS hint: banner above the bottom nav when `isIosSafari() && !isStandalone()` and `storix.iosHintDismissed` is unset: "Installe Storix : touche Partager puis « Sur l'écran d'accueil »." with the share icon and a close button. No `beforeinstallprompt` handling anywhere.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify:** `pnpm --filter @storix/web build` → `dist/sw.js` and `dist/manifest.webmanifest` exist and `dist/sw.js` contains `index.html` in its precache list. Full check happens on the production preview in Task 17 (service workers are only registered in production builds).
- [ ] **Step 3: Commit** (after go-ahead): `feat(web): make the app an installable pwa with app shell precache`

---

### Task 17: Production mode (API serves the SPA), prod preview, README

**Files:**
- Create: `apps/api/src/http/static.ts`, `apps/api/tsdown.config.ts`, `README.md`
- Modify: `apps/api/src/app.ts`, `apps/api/package.json`, root `package.json`

**Interfaces:**
- Produces: `registerStatic(app: FastifyInstance, distDir: string): Promise<void>`; root scripts `build` (`pnpm --filter @storix/web build && pnpm --filter @storix/api build`), `start` (`node apps/api/dist/server.js`), `preview:prod` (`pnpm build && node --env-file=.env.preview apps/api/dist/server.js`).

Pins:
- Static: registered only when `NODE_ENV=production`; `@fastify/static` root `WEB_DIST_DIR` (default: `apps/web/dist` resolved from the repo root), `wildcard: false`; `/assets/*` with `Cache-Control: public, max-age=31536000, immutable`; `sw.js`, `index.html`, `manifest.webmanifest` with `Cache-Control: no-cache`. The not-found handler: `/api/*` and `/media/*` → JSON 404 (reserved for Plan 2's media route, never the SPA); other `GET` with `Accept` containing `text/html` → `index.html` (SPA fallback); otherwise 404.
- Build: `tsdown` entry `src/server.ts`, ESM, platform node, bundle `@storix/*` workspace packages (they export TS sources), keep npm deps external. Verify the option name for forcing workspace packages into the bundle in the current tsdown docs.
- `.env.preview` (gitignored by `.env.*`): copy of `.env` with `NODE_ENV=production`, `PORT=3021`, `APP_ORIGIN=http://localhost:3021`.
- README (English): what Storix is (2 lines, link to spec and roadmap), prerequisites (Node 24, pnpm, Docker, Portly), setup (`pnpm install`, `cp .env.example .env`, secret generation, `pnpm dev:db`, `pnpm db:migrate`, bootstrap CLI with `BOOTSTRAP_PASSWORD`, Portly servers `storix/api` and `storix/web`), scripts table, ports, architecture overview (packages, layering rules and the ESLint mechanism, auth model: invite-only, no email, synthetic internal email, home league and reset code rule), the Better Auth schema regeneration caveat (re-apply the `home_league_id` FK), the TypeScript version decision, production notes (`https://storix.tristanhourtoulle.fr`, `PASSKEY_RP_ID=storix.tristanhourtoulle.fr`, `APP_ORIGIN` of the custom domain, migrations before start).

- [ ] **Step 1: Implement** static serving, build config, scripts, README.
- [ ] **Step 2: Register prod preview in Portly:** `portly port 3021 --json` (free), `portly add-server --project storix --name prod-preview --command 'pnpm preview:prod' --port 3021 --json` (no `--start`), then `portly start storix/prod-preview --json` and poll until healthy.
- [ ] **Step 3: Verify:**
  - `curl -s localhost:3021/api/health` → `{"status":"ok","db":"ok"}`
  - `curl -s -H 'Accept: text/html' localhost:3021/l/anything | head -c 200` → starts with `<!doctype html>`
  - `curl -sI localhost:3021/sw.js | grep -i cache-control` → `no-cache`; an `/assets/*.js` file → `immutable`
  - `curl -s localhost:3021/api/nope` → JSON `NOT_FOUND`; `curl -s -H 'Accept: text/html' localhost:3021/media/x` → JSON `NOT_FOUND` (not `index.html`)
  - `curl -sI localhost:3021/api/health | grep -i cache-control` → `no-store`; `curl -sI -H 'Accept: text/html' localhost:3021/l/x | grep -ic set-cookie` → `0`
  - Browser on `http://localhost:3021`: log in, DevTools > Application shows the manifest (installable, icons) and an activated service worker; with "Offline" ticked, reloading `/l/<id>` still renders the shell (data errors are acceptable). Lighthouse PWA/installability has no errors.
  - `portly stop storix/prod-preview --json`.
- [ ] **Step 4: Final checks:** `pnpm lint && pnpm typecheck && pnpm test` all clean; `git status` lists no `.env*` secrets.
- [ ] **Step 5: Commit** (after go-ahead): `feat(api): serve the built web app in production and document setup`
