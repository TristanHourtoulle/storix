# Storix Plan 2 — Photos → Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **Commits:** every task ends with a commit step, but `git add` / `git commit` run ONLY after the user's explicit go-ahead at execution time. Without it, stop at the step and report. Exception: Task 14 merges and pushes to `main` (authorized by Tristan for the first deploy).

**Goal:** In a league, a member uploads several phone photos; each becomes a card (title, tagged members, provisional rarity) after server-side processing; the Collection shows the league's cards in a virtualized grid with member filters, a card detail screen has the holo tilt effect, images are served same-origin through `/media` behind the Railway CDN and cached offline by the service worker, and the app is deployed to production on Railway for the first time.

**Architecture:** The browser resizes/converts each photo to JPEG (canvas), reads the EXIF date first, gets a presigned POST from the API, uploads straight to the private bucket (`incoming/{userId}/{uploadId}`), then calls `complete`, which enqueues a pg-boss `media.process` job. The new `apps/worker` (pg-boss + sharp) validates, strips metadata, renders 256/768/1600 AVIF + WebP variants under content-addressed immutable keys, computes thumbhash, dominant color and a 64-bit perceptual hash, rejects near-duplicates per league, and creates the card. The API serves variants at `GET /media/{windowStart}/{hmac}/{objectKey}` (HMAC, 24 h windows) with `Cache-Control: public, immutable` and no cookies, so the Railway CDN and the service worker (cache key without the signature segments) can cache them. A new `@storix/storage` package wraps the S3 client for both apps.

**Tech Stack:** Plan 1 stack + pg-boss 12, sharp 0.35, thumbhash, exifr, @aws-sdk/client-s3 + @aws-sdk/s3-presigned-post v3, @tanstack/react-virtual 3, MinIO (Docker Compose, dev only), Railway (Postgres, Bucket, CDN, two services).

**Spec:** `docs/superpowers/specs/2026-11-07-storix-design.md` (sections 4.3-4.5, 5.6, 6.1, 6.2, 6.5 and the **Addendum — Plan 0 results**, which overrides 6.1/6.2 for uploads and reads). Roadmap: `docs/superpowers/plans/2026-11-07-storix-roadmap.md`. Conventions established by Plan 1: `docs/superpowers/plans/2026-11-07-storix-01-foundation.md`. Visual source: direction A mockup (`.card*`, `.grid`, `.chips`, `.chip`, `.seg`, `.thumbs`, `.preview`, `.est`, `.info-row`, `.tilt`, `.pills`, `.meta*` rules, values copied below where they matter).

**Prerequisite:** Plan 1 is fully done (including Task 17: `apps/api/src/http/static.ts`, tsdown build, root `build`/`start`/`preview:prod` scripts, README) and `feat/foundation-web` is merged into `feat/foundation`. Plan 2 runs on branch `feat/photos-cards` created from `feat/foundation`.

## Global Constraints

- Product name `Storix`, package scope `@storix/*`, production origin `https://storix.tristanhourtoulle.fr` (custom domain, switched to only once DNS resolves; until then the Railway-generated domain is the origin).
- Run every command with Node 24 (`source ~/.nvm/nvm.sh && nvm use 24` first in each shell).
- Latest stable version of every dependency at install time: check each with `npm view <pkg> version` before adding it. Reference versions seen 2026-11-07: pg-boss 12.38.1, sharp 0.35.5, thumbhash 0.1.1, exifr 7.1.3, @aws-sdk/client-s3 3.1164.0, @aws-sdk/s3-presigned-post 3.1164.0, @tanstack/react-virtual 3.14.26, tsdown 0.23.7. Keep the versions Plan 1 already pinned.
- TypeScript stays on 6.0.3 repo-wide (Plan 1 exception: typescript-eslint's peer range excludes 7.x).
- Context7 is unavailable: before coding against pg-boss v12 (constructor options, `createQueue`, `send` options, `work` handler shape, `schedule`, `stop`), sharp 0.35 (AVIF/WebP options, `stats().dominant`, `raw()`), thumbhash, exifr, `@aws-sdk/s3-presigned-post` `createPresignedPost`, S3 `GetObject` body streaming, `@tanstack/react-virtual` `useWindowVirtualizer`, Serwist v9 runtime caching (`CacheFirst`, `StaleWhileRevalidate`, `ExpirationPlugin`, `CacheableResponsePlugin`, `cacheKeyWillBeUsed`), and the Railway CLI (`railway --help` on each subcommand), read the official docs and verify every signature this plan pins. If a pin is wrong, keep the behavior, adapt the call, and say so in the task report.
- TypeScript everywhere, `strict`, `noUncheckedIndexedAccess`, `noImplicitReturns`, no `any` (use `unknown` + guards), immutable data, Zod at every boundary (env, HTTP in/out, job payloads, web responses, JSON columns).
- NO comments in code except basic JSDoc on public functions. Everything in English (code, README, logs, commits as `type(scope): description`). UI copy in French.
- Strict layering: routes = HTTP only; services = use cases (no SQL, no HTTP objects, no S3 SDK, no sharp); repositories = Drizzle only; gateways (`auth.gateway.ts`, `@storix/storage`, `jobs/job-queue.ts`, worker `image-pipeline.ts`) wrap libraries; worker `*.job.ts` = parse payload + call one service, nothing else; `packages/shared/src/domain` = pure (only `./*` imports, so no `node:crypto`: HMAC lives in the API); React components presentational, data in hooks.
- Tests: Vitest unit tests ONLY for pure functions in `packages/shared/src/domain`. No other suites, no CI/CD. Every other task ends with a manual verification (command + expected output, or a browser check).
- Files 200-400 lines max. No `console.*` (pino in api/worker; `apps/web/src/lib/logger.ts` is the only file allowed to call `console`).
- Ports: web 5180, api 3020, postgres 5440, prod preview 3021, MinIO S3 9100, MinIO console 9101. Never use 3000, 3001, 3003, 3004, 4001-4004, 4009, 5433, 8080, 9000. Persistent dev servers run only through Portly (`storix/api`, `storix/web`, `storix/worker`, `storix/prod-preview`), never as background processes.
- No email anywhere in the product.
- `/media` constraints (spec addendum): `GET /media/{windowStart}/{hmac}/{objectKey}`, HMAC-SHA256 over `windowStart` + `objectKey` with `MEDIA_URL_SECRET`, 24 h UTC windows, current and previous window accepted; success responses `Cache-Control: public, max-age=<seconds until the URL stops being accepted>, immutable`, never `Set-Cookie`, never a session lookup; error responses `Cache-Control: no-store`. No global hook may set cookies or `private`/`no-store` outside `/api/*`. No `@fastify/cors`. The SPA fallback never answers `/media/*`.
- Bucket access: endpoint `https://t3.storageapi.dev`, SDK region `auto`, virtual-hosted style (`forcePathStyle: false`) in production; real bucket name = `bucketName` from `railway bucket credentials --bucket storix-media --json`. Upload = presigned POST only (`content-length-range` 1..15 MB, exact `Content-Type`, `Cache-Control` form field with an `eq` condition). Presigned PUT is forbidden.
- Media files are never reachable through a guessable public URL and never carry EXIF/GPS.

## Review Focus

1. The same photo uploaded twice, or a re-saved / slightly recompressed copy of it (screenshot, WhatsApp re-send), including two uploads processed at the same moment: the second becomes "Cette photo est déjà dans la ligue" and no second card exists (Task 1 `isDuplicatePhoto` tests; Task 7 advisory-lock check with two parallel jobs).
2. An iPhone HEIC portrait photo: the card is upright and keeps its capture date; the same HEIC picked on desktop Chrome (no HEIC decoder) shows a clear French error on that thumbnail instead of a broken card or a stuck spinner (Task 10 browser check).
3. A `/media` URL from yesterday's window still loads; one from two days ago, or with one character of the key or signature changed, gets 403 with `no-store`, and the CDN never stores an error or anything with `Set-Cookie` (Task 1 window tests; Task 5 curl checks; Task 14 `x-cache` checks).
4. Eleven photos sent at once with a 10/day quota (two tabs, double tap): exactly ten presigns succeed, the eleventh gets "Tu as atteint ta limite de 10 photos aujourd'hui" (Task 6 parallel curl check).
5. The network drops in the middle of "Créer N cartes", or `complete` is retried: photos already created are not duplicated, the others retry when the phone is back online while the screen is open (Task 6 idempotent `complete` check; Task 10 offline toggle check).

---

## File Structure

```
docker-compose.yml                         + minio, minio-init
.env.example                               + S3_*, MEDIA_URL_SECRET
eslint.config.js                           + worker / storage / job boundaries
packages/shared/src/domain/
  cards.ts  media-urls.ts  uploads.ts  perceptual-hash.ts  (+ *.test.ts)
packages/shared/src/schemas/
  uploads.ts  cards.ts  media.ts  jobs.ts  errors.ts (modified)
packages/db/src/schema/
  uploads.ts  media.ts  cards.ts  index.ts (modified)
packages/storage/                          @storix/storage
  src/index.ts  object-storage.ts  config.ts  cli/set-cors.ts
apps/api/src/
  config/env.ts (modified)  deps.ts (modified)  app.ts (modified)  server.ts (modified)
  lib/media-signer.ts
  jobs/job-queue.ts
  features/media/{media.routes,media.service}.ts
  features/uploads/{uploads.routes,uploads.service,uploads.repository}.ts
  features/cards/{cards.routes,cards.service,cards.repository,image-set}.ts
  cli/migrate.ts
apps/worker/
  package.json  tsconfig.json  tsdown.config.ts
  src/main.ts  config/env.ts  lib/logger.ts
  src/jobs/{media-process.job,media-sweep.job}.ts
  src/features/media/{media-processing.service,media-sweep.service,media.repository,image-pipeline}.ts
apps/web/
  vite.config.ts (proxy /media)  src/sw.ts (runtime caching)
  src/components/ui/{chip,segmented}.tsx  bottom-nav.tsx (sticky)
  src/features/uploads/  uploads.api.ts  prepare-photo.ts  use-photo-drafts.ts  use-create-cards.ts  use-upload-quota.ts  components/{photo-picker,draft-thumbs,draft-editor,member-tag-chips}.tsx
  src/features/cards/    cards.api.ts  cards.queries.ts  tier-labels.ts  card-number.ts  use-holo-tilt.ts  components/{card-face,card-image,collection-grid,member-filter,card-detail}.tsx
  src/features/pwa/persist-storage.ts
  src/routes/_authed/l.$leagueId.add.tsx (rewritten)  l.$leagueId.collection.tsx (rewritten)  l.$leagueId.cards.$cardId.tsx
  src/styles/app.css (+ card / holo rules)
```

---

### Task 1: Pure domain — card tiers, media URL windows, upload rules, perceptual hash

**Files:**
- Create: `packages/shared/src/domain/{cards,media-urls,uploads,perceptual-hash}.ts`
- Modify: `packages/shared/src/domain/index.ts` (re-export)
- Test: `packages/shared/src/domain/{media-urls,uploads,perceptual-hash}.test.ts`

**Interfaces:**
- Produces (all exported from `@storix/shared/domain`):
  - `cards.ts`: `CARD_TIERS = ['common','uncommon','rare','epic','legendary','mythic'] as const`; `type CardTier`; `PROVISIONAL_TIER: CardTier = 'common'`; `CARD_TITLE_MAX_LENGTH = 40`
  - `media-urls.ts`: `MEDIA_WINDOW_SECONDS = 86_400`; `MEDIA_VARIANT_SIZES = [256, 768, 1600] as const`; `MEDIA_FORMATS = ['avif','webp'] as const`; types `MediaVariantSize`, `MediaFormat`
    - `mediaWindowStart(now: Date): number` — unix seconds of the UTC midnight at or before `now`
    - `isMediaWindowAccepted(windowStart: number, now: Date): boolean` — true only for the current and the previous window start
    - `mediaMaxAgeSeconds(windowStart: number, now: Date): number` — `windowStart + 2 × MEDIA_WINDOW_SECONDS − nowSeconds`, floored, never below 0
    - `mediaSignaturePayload(windowStart: number, objectKey: string): string` — `` `${windowStart}\n${objectKey}` ``
    - `mediaVariantKey(input: { leagueId: string; sourceSha256: string; size: MediaVariantSize; format: MediaFormat }): string` — `img/{leagueId}/{sourceSha256}/{size}.{format}`
    - `MEDIA_OBJECT_KEY_PATTERN = /^img\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[0-9a-f]{64}\/(256|768|1600)\.(avif|webp)$/`
    - `buildMediaPath(windowStart: number, signature: string, objectKey: string): string` — `/media/{windowStart}/{signature}/{objectKey}`
    - `parseMediaPath(pathname: string): { windowStart: number; signature: string; objectKey: string } | null` — signature must be 64 lowercase hex, windowStart a positive integer multiple of `MEDIA_WINDOW_SECONDS`, objectKey must match `MEDIA_OBJECT_KEY_PATTERN`; anything else (extra segments, `..`, query) → null
    - `mediaCacheKey(pathname: string): string | null` — `/media/{objectKey}` for a valid media path, else null (used by the service worker)
  - `uploads.ts`: `UPLOAD_MIN_BYTES = 1`; `UPLOAD_MAX_BYTES = 15 * 1024 * 1024`; `UPLOAD_CONTENT_TYPE = 'image/jpeg'`; `UPLOAD_PRESIGN_TTL_SECONDS = 900`; `DEFAULT_UPLOAD_QUOTA_PER_DAY = 10`; `UPLOAD_QUOTA_WINDOW_MS = 86_400_000`; `CLIENT_MAX_EDGE_PX = 2048`; `MIN_CAPTURE_DATE = new Date('1990-01-01T00:00:00Z')`
    - `remainingUploadQuota(input: { limit: number; used: number }): number` (never below 0)
    - `checkUploadQuota(input: { limit: number; used: number; requested: number }): { allowed: true } | { allowed: false; remaining: number }`
    - `uploadQuotaWindowStart(now: Date): Date` — `now − 24 h` (rolling window)
    - `sanitizeCaptureDate(raw: Date | null, now: Date): Date | null` — null when missing, invalid, before `MIN_CAPTURE_DATE`, or later than `now + 24 h`
  - `perceptual-hash.ts`: `PHASH_SIZE = 32`; `PHASH_DUPLICATE_MAX_DISTANCE = 6`
    - `perceptualHash(gray: Uint8Array): string` — input is a 32×32 grayscale image (1024 bytes, row-major); output 16 lowercase hex chars (64 bits). Throws on wrong length.
    - `hammingDistance(a: string, b: string): number` — over two 16-hex hashes (BigInt XOR popcount); throws on malformed input
    - `isDuplicatePhoto(a: string, b: string): boolean` — `hammingDistance ≤ PHASH_DUPLICATE_MAX_DISTANCE`
    - `findDuplicate<T extends { phash: string }>(candidate: string, existing: readonly T[]): T | null` — the closest existing entry within the threshold, else null

`perceptualHash` algorithm (pinned, the signature does not determine it): 2-D DCT-II of the 32×32 input (separable, `cos((2x+1)uπ/64)`), keep the top-left 8×8 block, median of those 64 coefficients excluding `[0][0]`, bit `i` (row-major over the 8×8 block, MSB first) = coefficient `> median`. Bit for `[0][0]` is always computed the same way (so a uniform brightness shift never changes the hash).

- [ ] **Step 1: Write the failing tests.**

```ts
// media-urls.test.ts
const now = new Date('2026-11-07T10:00:00Z')
const key = 'img/0b7c2f4e-1a2b-4c3d-8e9f-0123456789ab/' + 'a'.repeat(64) + '/768.avif'
const sig = 'f'.repeat(64)
it('starts windows at UTC midnight', () => expect(mediaWindowStart(now)).toBe(1794009600))
it('accepts the current and previous window only', () => {
  expect(isMediaWindowAccepted(1794009600, now)).toBe(true)
  expect(isMediaWindowAccepted(1793923200, now)).toBe(true)
  expect(isMediaWindowAccepted(1793836800, now)).toBe(false)
  expect(isMediaWindowAccepted(1794096000, now)).toBe(false)
})
it('caps max-age at the end of acceptance', () => {
  expect(mediaMaxAgeSeconds(1794009600, now)).toBe(136800)
  expect(mediaMaxAgeSeconds(1793923200, now)).toBe(50400)
  expect(mediaMaxAgeSeconds(1793836800, now)).toBe(0)
})
it('builds and parses media paths', () => {
  const path = buildMediaPath(1794009600, sig, key)
  expect(path).toBe(`/media/1794009600/${sig}/${key}`)
  expect(parseMediaPath(path)).toEqual({ windowStart: 1794009600, signature: sig, objectKey: key })
})
it('rejects malformed media paths', () => {
  expect(parseMediaPath(`/media/1794009600/${sig}/img/../secret`)).toBeNull()
  expect(parseMediaPath(`/media/1794009601/${sig}/${key}`)).toBeNull()
  expect(parseMediaPath(`/media/abc/${sig}/${key}`)).toBeNull()
  expect(parseMediaPath(`/media/1794009600/${sig.toUpperCase()}/${key}`)).toBeNull()
  expect(parseMediaPath(`/media/1794009600/${sig}/${key.replace('768', '512')}`)).toBeNull()
  expect(parseMediaPath(`/media/1794009600/${sig}/incoming/u1/x`)).toBeNull()
})
it('derives the cache key without window and signature', () => {
  expect(mediaCacheKey(`/media/1794009600/${sig}/${key}`)).toBe(`/media/${key}`)
  expect(mediaCacheKey('/api/me')).toBeNull()
})
it('builds variant keys', () =>
  expect(mediaVariantKey({ leagueId: '0b7c2f4e-1a2b-4c3d-8e9f-0123456789ab', sourceSha256: 'a'.repeat(64), size: 768, format: 'avif' })).toBe(key))

// uploads.test.ts
it('computes remaining quota', () => {
  expect(remainingUploadQuota({ limit: 10, used: 7 })).toBe(3)
  expect(remainingUploadQuota({ limit: 10, used: 12 })).toBe(0)
})
it('checks a request against the quota', () => {
  expect(checkUploadQuota({ limit: 10, used: 9, requested: 1 })).toEqual({ allowed: true })
  expect(checkUploadQuota({ limit: 10, used: 10, requested: 1 })).toEqual({ allowed: false, remaining: 0 })
  expect(checkUploadQuota({ limit: 10, used: 8, requested: 3 })).toEqual({ allowed: false, remaining: 2 })
})
it('uses a rolling 24h window', () =>
  expect(uploadQuotaWindowStart(new Date('2026-11-07T10:00:00Z')).toISOString()).toBe('2026-11-06T10:00:00.000Z'))
it('sanitizes untrusted capture dates', () => {
  const now = new Date('2026-11-07T10:00:00Z')
  expect(sanitizeCaptureDate(null, now)).toBeNull()
  expect(sanitizeCaptureDate(new Date('invalid'), now)).toBeNull()
  expect(sanitizeCaptureDate(new Date('1989-12-31T23:59:59Z'), now)).toBeNull()
  expect(sanitizeCaptureDate(new Date('2026-11-08T10:00:01Z'), now)).toBeNull()
  expect(sanitizeCaptureDate(new Date('2026-11-08T10:00:00Z'), now)?.toISOString()).toBe('2026-11-08T10:00:00.000Z')
  expect(sanitizeCaptureDate(new Date('2017-03-03T12:00:00Z'), now)?.toISOString()).toBe('2017-03-03T12:00:00.000Z')
})

// perceptual-hash.test.ts
const image = (f: (x: number, y: number) => number) =>
  Uint8Array.from({ length: 1024 }, (_, i) => Math.max(0, Math.min(255, Math.round(f(i % 32, Math.floor(i / 32))))))
const diagonal = image((x, y) => (x + y) * 4)
const rings = image((x, y) => 128 + 120 * Math.sin(Math.hypot(x - 16, y - 16) / 2))
it('returns 16 hex chars', () => expect(perceptualHash(diagonal)).toMatch(/^[0-9a-f]{16}$/))
it('ignores a uniform brightness shift', () =>
  expect(perceptualHash(image((x, y) => (x + y) * 4 + 3))).toBe(perceptualHash(diagonal)))
it('stays close under light noise', () => {
  const noisy = image((x, y) => (x + y) * 4 + ((x * 7 + y * 13) % 5) - 2)
  expect(isDuplicatePhoto(perceptualHash(noisy), perceptualHash(diagonal))).toBe(true)
})
it('separates different images', () =>
  expect(isDuplicatePhoto(perceptualHash(rings), perceptualHash(diagonal))).toBe(false))
it('measures hamming distance', () => {
  expect(hammingDistance('0000000000000000', '000000000000003f')).toBe(6)
  expect(hammingDistance('0000000000000000', 'ffffffffffffffff')).toBe(64)
})
it('uses an inclusive threshold of 6', () => {
  expect(isDuplicatePhoto('0000000000000000', '000000000000003f')).toBe(true)
  expect(isDuplicatePhoto('0000000000000000', '000000000000007f')).toBe(false)
})
it('finds the closest duplicate', () => {
  const existing = [{ id: 'far', phash: '00000000000000ff' }, { id: 'near', phash: '0000000000000001' }]
  expect(findDuplicate('0000000000000000', existing)?.id).toBe('near')
  expect(findDuplicate('ffffffffffffffff', existing)).toBeNull()
})
it('rejects a wrong input size', () => expect(() => perceptualHash(new Uint8Array(10))).toThrow())
```

- [ ] **Step 2: Run** `pnpm test` → FAIL (modules not found).
- [ ] **Step 3: Implement** the functions in Interfaces; `index.ts` re-exports the four modules. No imports outside `./`. One-line JSDoc each.
- [ ] **Step 4: Run** `pnpm test && pnpm lint && pnpm typecheck` → all PASS, no errors.
- [ ] **Step 5: Commit** (after go-ahead): `feat(shared): add pure rules for media urls, upload quota and perceptual hashing`

---

### Task 2: Shared Zod contracts — uploads, cards, media variants, jobs, error codes

**Files:**
- Create: `packages/shared/src/schemas/{media,uploads,cards,jobs}.ts`
- Modify: `packages/shared/src/schemas/{errors,index}.ts`, `apps/web/src/features/errors/error-messages.ts` (the `Record<ErrorCode, string>` must stay exhaustive)

**Interfaces:**
- Consumes: Task 1 constants.
- Produces (schemas + inferred types from `@storix/shared`):
  - `errors.ts`: append `'UPLOAD_QUOTA_EXCEEDED'`, `'UPLOAD_NOT_READY'` to `ERROR_CODES`; web messages: `UPLOAD_QUOTA_EXCEEDED` → "Tu as atteint ta limite de 10 photos aujourd'hui.", `UPLOAD_NOT_READY` → "La photo n'est pas encore arrivée, réessaie."
  - `media.ts`: `mediaVariantSchema = { size: z.union(MEDIA_VARIANT_SIZES literals), format: z.enum(MEDIA_FORMATS), key: z.string().regex(MEDIA_OBJECT_KEY_PATTERN), width: z.int().positive(), height: z.int().positive(), bytes: z.int().positive() }`; `mediaVariantsSchema = z.array(mediaVariantSchema).length(6)`; `imageSourceSchema = { url: z.string().startsWith('/media/'), width: z.int().positive() }`; `imageSetSchema = { avif: z.array(imageSourceSchema).min(1), webp: z.array(imageSourceSchema).min(1) }` (each sorted by width ascending).
  - `uploads.ts`: `UPLOAD_STATUSES = ['pending','uploaded','processing','ready','rejected','failed'] as const`; `UPLOAD_REJECTION_REASONS = ['DUPLICATE_PHOTO','INVALID_IMAGE'] as const`; `createUploadBodySchema = { contentType: z.literal(UPLOAD_CONTENT_TYPE), size: z.int().min(UPLOAD_MIN_BYTES).max(UPLOAD_MAX_BYTES) }`; `createUploadResponseSchema = { uploadId: z.uuid(), url: z.url(), fields: z.record(z.string(), z.string()), expiresAt: isoDateSchema }`; `cardTitleSchema = z.string().trim().min(1).max(CARD_TITLE_MAX_LENGTH)`; `completeUploadBodySchema = { title: cardTitleSchema, taggedUserIds: z.array(idSchema).max(30).refine(unique), capturedAt: isoDateSchema.nullable() }`; `uploadStateSchema = { uploadId, status, cardId: z.uuid().nullable(), rejectionReason: z.enum(...).nullable() }`; `uploadQuotaSchema = { limit, used, remaining }` (ints ≥ 0); `uploadParamsSchema = { leagueId: z.uuid(), uploadId: z.uuid() }`.
  - `cards.ts`: `cardTierSchema = z.enum(CARD_TIERS)`; `cardPersonSchema = { userId: idSchema.nullable(), displayUsername: z.string().nullable() }`; `cardSummarySchema = { id: z.uuid(), number: z.int().positive(), title, tier, isProvisional: z.boolean(), author: cardPersonSchema, thumbhash: z.string(), dominantColor: z.string().regex(/^#[0-9a-f]{6}$/), width, height, image: imageSetSchema }` (summary image sets carry 256 + 768); `cardDetailSchema = cardSummarySchema.extend({ capturedAt: isoDateSchema.nullable(), isCaptureDateValidated: z.boolean(), createdAt: isoDateSchema, tagged: z.array(cardPersonSchema) })` (detail image sets carry all three sizes); `listCardsQuerySchema = { authorId: idSchema.optional(), cursor: z.coerce.number().int().positive().optional(), limit: z.coerce.number().int().min(1).max(200).default(120) }`; `cardPageSchema = { cards: z.array(cardSummarySchema), nextCursor: z.int().positive().nullable(), total: z.int().min(0) }`; `cardParamsSchema = { leagueId: z.uuid(), cardId: z.uuid() }`.
  - `jobs.ts`: `MEDIA_PROCESS_JOB = 'media.process'`, `MEDIA_SWEEP_JOB = 'media.sweep-incoming'`, `mediaProcessPayloadSchema = z.object({ uploadId: z.uuid() })`, `type MediaProcessPayload`.

- [ ] **Step 1: Implement** the schemas (dates as ISO strings on the wire).
- [ ] **Step 2: Verify** `pnpm lint && pnpm typecheck` → no errors.
- [ ] **Step 3: Commit** (after go-ahead): `feat(shared): add zod contracts for uploads, cards, media variants and jobs`

---

### Task 3: Database — uploads, media, cards, card tags

**Files:**
- Create: `packages/db/src/schema/{uploads,media,cards}.ts`
- Modify: `packages/db/src/schema/index.ts`, `packages/db/src/schema/audit-log.ts` (append `'card.created'` to `AUDIT_ACTIONS`)
- Generated: `packages/db/drizzle/0001_*.sql`

**Interfaces:**
- Consumes: `UPLOAD_STATUSES`, `UPLOAD_REJECTION_REASONS`, `CARD_TIERS`, `MediaVariant` type.
- Produces (exported from `@storix/db`): tables `uploads`, `media`, `cards`, `cardTags`; enums `uploadStatus`, `uploadRejectionReason`, `cardTier`, `cardStatus` (`['active','hidden']`), `captureDateSource` (`['exif','client']`).

Tables (snake_case, timestamps with time zone, uuid pk `defaultRandom()`):
- `uploads { id, league_id fk leagues cascade, user_id text fk user cascade, object_key text unique not null, status upload_status not null default 'pending', title text null, tagged_user_ids jsonb $type<string[]> not null default [], client_captured_at null, rejection_reason upload_rejection_reason null, card_id uuid null fk cards set null, created_at, completed_at null, processed_at null }`, index `(league_id, user_id, created_at desc)`, index `(status, created_at)`.
- `media { id, league_id fk cascade, upload_id uuid unique not null fk uploads restrict, source_sha256 text not null, phash text not null, thumbhash text not null, dominant_color text not null, width int, height int, captured_at null, capture_date_source capture_date_source null, is_capture_date_validated boolean not null default false, variants jsonb $type<MediaVariant[]> not null, created_at }`, unique `(league_id, source_sha256)`, index `(league_id)`.
- `cards { id, league_id fk cascade, media_id uuid unique not null fk media restrict, author_id text null fk user set null, number int not null, title text not null, tier card_tier not null default 'common', is_provisional boolean not null default true, status card_status not null default 'active', created_at }`, unique `(league_id, number)`, index `(league_id, author_id, number desc)`.
- `card_tags { card_id fk cards cascade, user_id text fk user cascade, pk(card_id, user_id) }`, index `(user_id)`.

- [ ] **Step 1: Implement** the schema files; `index.ts` exports them.
- [ ] **Step 2: Migrate.** `pnpm db:generate && pnpm db:migrate`.
- [ ] **Step 3: Verify.** `docker compose exec postgres psql -U storix -d storix -c '\d uploads' -c '\d media' -c '\d cards' -c '\d card_tags'` → columns, FKs and the unique indexes above exist; `pnpm lint && pnpm typecheck` clean.
- [ ] **Step 4: Commit** (after go-ahead): `feat(db): add uploads, media, cards and card tags tables`

---

### Task 4: Object storage package and local MinIO

**Files:**
- Create: `packages/storage/{package.json,tsconfig.json}`, `packages/storage/src/{index,config,object-storage}.ts`, `packages/storage/src/cli/set-cors.ts`
- Modify: `docker-compose.yml`, `.env.example`, `.env` (local, not committed), `eslint.config.js`, `AGENTS.md` (ports line)

**Interfaces:**
- Produces from `@storix/storage` (deps `@aws-sdk/client-s3`, `@aws-sdk/s3-presigned-post`, `zod`; scripts `typecheck`, `set-cors: tsx src/cli/set-cors.ts`):
  - `storageEnvSchema` (Zod object, merged into api/worker env): `S3_ENDPOINT: z.url()`, `S3_REGION: z.string().default('auto')`, `S3_BUCKET: z.string().min(1)`, `S3_ACCESS_KEY_ID: z.string().min(1)`, `S3_SECRET_ACCESS_KEY: z.string().min(1)`, `S3_FORCE_PATH_STYLE: z.stringbool().default(false)`; `type StorageEnv`
  - `createObjectStorage(env: StorageEnv): ObjectStorage`
  - `interface ObjectStorage { readonly uploadOrigin: string; presignUpload(input: { key: string; contentType: string; minBytes: number; maxBytes: number; cacheControl: string; expiresInSeconds: number }): Promise<{ url: string; fields: Record<string, string> }>; head(key: string): Promise<{ contentLength: number; contentType: string | null } | null>; getStream(key: string): Promise<{ body: Readable; contentType: string | null; contentLength: number | null; etag: string | null } | null>; getBuffer(key: string, maxBytes: number): Promise<Buffer | null>; put(input: { key: string; body: Buffer; contentType: string; cacheControl: string }): Promise<void>; delete(keys: readonly string[]): Promise<void>; setCors(origins: readonly string[]): Promise<void> }`
  - `uploadOrigin`: path style → origin of `S3_ENDPOINT`; virtual-hosted → `https://{S3_BUCKET}.{endpoint host}`. It feeds the CSP `connect-src`.
  - `NoSuchKey` / 404 from S3 → `null` (never throw for a missing object). `delete` uses `DeleteObjects` in chunks of 1000.
- `presignUpload` pins (spike-verified): `createPresignedPost(client, { Bucket, Key, Expires: expiresInSeconds, Fields: { 'Content-Type': contentType, 'Cache-Control': cacheControl }, Conditions: [['content-length-range', minBytes, maxBytes], ['eq', '$Content-Type', contentType], ['eq', '$Cache-Control', cacheControl]] })`.
- `cli/set-cors.ts`: `--origins a,b` → `PutBucketCors` with methods GET/PUT/POST/HEAD, headers `*`, expose `ETag`, max-age 3600; logs the applied rules through pino. Reads env with `storageEnvSchema`.

Docker Compose (MinIO community images stopped being published in late 2025: pin the most recent `minio/minio` and `minio/mc` `RELEASE.*` tags that `docker pull` still serves and write the exact tags in the file):
- `minio`: command `server /data --console-address :9001`, env `MINIO_ROOT_USER=storix`, `MINIO_ROOT_PASSWORD=storix-dev-secret`, `MINIO_API_CORS_ALLOW_ORIGIN=http://localhost:5180,http://localhost:3021` (MinIO has no per-bucket CORS), ports `"9100:9000"`, `"9101:9001"`, volume `storix-minio:/data`, healthcheck `mc ready local` (or `curl -f http://localhost:9000/minio/health/live`).
- `minio-init` (one-shot, `depends_on: minio: condition: service_healthy`, `restart: "no"`): `mc alias set local http://minio:9000 storix storix-dev-secret && mc mb --ignore-existing local/storix-media && mc anonymous set none local/storix-media`.
- Root script `dev:db` becomes `docker compose up -d postgres minio minio-init`.

`.env.example` additions: `S3_ENDPOINT=http://localhost:9100`, `S3_REGION=us-east-1`, `S3_BUCKET=storix-media`, `S3_ACCESS_KEY_ID=storix`, `S3_SECRET_ACCESS_KEY=storix-dev-secret`, `S3_FORCE_PATH_STYLE=true`, `MEDIA_URL_SECRET=` (README: `openssl rand -base64 32`).

ESLint additions (same mechanism as Plan 1): `packages/storage/**` may not import `fastify`, `react`, `@storix/db`, `drizzle-orm*`, `better-auth*`; the existing service / repository / routes globs are widened from `apps/api/src/**` to `apps/{api,worker}/src/**`, and services additionally ban `@aws-sdk/*`, `sharp`, `pg-boss`; new glob `apps/worker/src/**/*.job.ts` bans `drizzle-orm*`, `@storix/db`, `**/*.repository*`, `sharp`, `@aws-sdk/*`.

- [ ] **Step 1: Implement** the package, compose services, env and lint rules.
- [ ] **Step 2: Verify.**
  - `pnpm dev:db && docker compose logs minio-init | tail -3` → bucket created (or already exists).
  - `curl -s -o /dev/null -w '%{http_code}' http://localhost:9100/storix-media/x` → `403` (bucket is private).
  - Presign round-trip from a throwaway shell command (not a file): `pnpm --filter @storix/storage exec tsx --env-file=../../.env -e "<create storage, presignUpload({ key: 'incoming/dev/check', contentType: 'image/jpeg', minBytes: 1, maxBytes: 15728640, cacheControl: 'no-store', expiresInSeconds: 900 }), print JSON>"`, then `curl -s -o /dev/null -w '%{http_code}' -F <each field> -F file=@any.jpg <url>` → `204`; repeat with `Content-Type=image/png` in the form → `403`; `head('incoming/dev/check')` → `contentLength` > 0; `delete(['incoming/dev/check'])`.
  - Boundary check: `import sharp from 'sharp'` in a file named `apps/worker/src/x.job.ts` → `pnpm lint` error; delete it.
  - `pnpm lint && pnpm typecheck` clean.
- [ ] **Step 3: Commit** (after go-ahead): `feat(storage): add s3 object storage package and local minio`

---

### Task 5: Same-origin `/media` route with windowed HMAC URLs

**Files:**
- Create: `apps/api/src/lib/media-signer.ts`, `apps/api/src/features/media/{media.routes,media.service}.ts`
- Modify: `apps/api/src/config/env.ts`, `apps/api/src/deps.ts`, `apps/api/src/app.ts`, `apps/api/src/http/error-handler.ts`, `apps/api/package.json` (dep `@storix/storage`), `apps/web/vite.config.ts`

**Interfaces:**
- Consumes: `storageEnvSchema`, `createObjectStorage`, `ObjectStorage` (Task 4); `mediaWindowStart`, `isMediaWindowAccepted`, `mediaMaxAgeSeconds`, `mediaSignaturePayload`, `buildMediaPath`, `parseMediaPath` (Task 1); `safeEqualHex` (Plan 1 `lib/crypto.ts`).
- Produces:
  - env: `loadEnv` schema = Plan 1 schema `.extend(storageEnvSchema.shape)` + `MEDIA_URL_SECRET: z.string().min(32)`.
  - `lib/media-signer.ts`: `interface MediaSigner { urlFor(objectKey: string): string; verify(path: { windowStart: number; signature: string; objectKey: string }): boolean }`; `createMediaSigner(secret: string, clock: () => Date): MediaSigner` — `urlFor` signs with `mediaWindowStart(clock())` (deterministic within the window); `verify` = window accepted AND `safeEqualHex(hmacHex, signature)` where `hmacHex = createHmac('sha256', secret).update(mediaSignaturePayload(...)).digest('hex')`.
  - `AppDeps` gains `storage: ObjectStorage` and `mediaSigner: MediaSigner`; `createAppDeps(env, db)` builds both.
  - `mediaService.open(pathname: string): Promise<{ stream: Readable; contentType: string; contentLength: number | null; etag: string | null; maxAgeSeconds: number }>` — `parseMediaPath` null or `verify` false → `forbidden()`; object missing → `notFound()`; content type = `image/avif` or `image/webp` from the key extension.
  - `mediaRoutes(service)`: registered WITHOUT the `/api` prefix: `GET /media/*` (Fastify also answers HEAD). Success: status 200, `Content-Type`, `Content-Length` when known, `ETag`, `Cache-Control: public, max-age=<maxAgeSeconds>, immutable`, `X-Content-Type-Options: nosniff`, body = the S3 stream. No `authenticate`, no rate limit, no session lookup.
- `error-handler.ts`: every error response whose URL starts with `/media/` gets `Cache-Control: no-store`; the not-found handler answers `/media/*` with JSON 404 + `no-store` (keep Plan 1's rule that the SPA fallback never serves `/media/*`).
- `app.ts`: helmet CSP gains `connectSrc: ["'self'", deps.storage.uploadOrigin]`. Verify no plugin or hook adds `Set-Cookie` or `Vary: Cookie` to `/media/*`.
- `vite.config.ts`: proxy `'/media': { target: 'http://localhost:3020', changeOrigin: false }`.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify** (api restarts via Portly):
  - Seed one object: `docker compose run --rm --entrypoint sh minio-init -c "mc alias set local http://minio:9000 storix storix-dev-secret && echo hi | mc pipe local/storix-media/img/0b7c2f4e-1a2b-4c3d-8e9f-0123456789ab/$(printf a%.0s {1..64})/256.webp"`.
  - Print a signed path with a throwaway `tsx -e` using `createMediaSigner(process.env.MEDIA_URL_SECRET, () => new Date()).urlFor(<key>)`.
  - `curl -sI localhost:3020<path>` → `200`, `cache-control: public, max-age=<between 86400 and 172800>, immutable`, `content-type: image/webp`, no `set-cookie`.
  - Same request with the browser session cookie (`-b /tmp/storix-a.txt`) → still no `set-cookie`.
  - Flip one hex char of the signature → `403` with `cache-control: no-store`; window from three days ago (re-sign with a fake clock) → `403`; valid signature on a missing key → `404` + `no-store`; `/media/x` with `Accept: text/html` → JSON 404 (not `index.html`).
  - `curl -sI localhost:5180<path>` → `200` through the Vite proxy.
- [ ] **Step 3: Commit** (after go-ahead): `feat(api): serve media same-origin behind windowed hmac urls`

---

### Task 6: Uploads API — presign, quota, complete, status, job enqueue

**Files:**
- Create: `apps/api/src/jobs/job-queue.ts`, `apps/api/src/features/uploads/{uploads.routes,uploads.service,uploads.repository}.ts`
- Modify: `apps/api/src/deps.ts`, `apps/api/src/app.ts`, `apps/api/src/server.ts`, `apps/api/src/http/rate-limit.ts`, `apps/api/package.json` (dep `pg-boss`)

**Interfaces:**
- Consumes: `ObjectStorage`; `checkUploadQuota`, `remainingUploadQuota`, `uploadQuotaWindowStart`, `sanitizeCaptureDate`, `DEFAULT_UPLOAD_QUOTA_PER_DAY`, `UPLOAD_*` constants; `MEDIA_PROCESS_JOB`, `MediaProcessPayload`; upload schemas (Task 2); `requireLeagueRole`, `listMembers` / `findMembership`.
- Produces:
  - `jobs/job-queue.ts`: `interface JobQueue { enqueueMediaProcess(payload: MediaProcessPayload): Promise<void>; stop(): Promise<void> }`; `startJobQueue(input: { databaseUrl: string; logger: FastifyBaseLogger }): Promise<JobQueue>` — `new PgBoss({ connectionString, schema: 'pgboss' })` with the API in send-only mode (disable supervision/scheduling: verify the v12 option names), `boss.on('error', log)`, `start()`, `createQueue(MEDIA_PROCESS_JOB)` (idempotent), `send(MEDIA_PROCESS_JOB, payload, { singletonKey: payload.uploadId, retryLimit: 3, retryDelay: 15, retryBackoff: true })`. `AppDeps` gains `jobs: JobQueue`; `server.ts` starts it before `buildApp` and stops it on shutdown.
  - `rateLimits.uploadCreate = { max: 30, timeWindow: '1 minute' }`.
  - repository: `lockMemberRow(db, leagueId, userId): Promise<void>` (`SELECT 1 FROM league_members WHERE ... FOR UPDATE`), `countUploadsSince(db, input: { leagueId; userId; since: Date; pendingSince: Date }): Promise<number>` (counts `uploaded|processing|ready` created since `since`, plus `pending` created since `pendingSince`), `insertUpload(db, input: { id; leagueId; userId; objectKey }): Promise<void>`, `findUpload(db, leagueId, uploadId): Promise<UploadRow | null>`, `markUploaded(db, input: { id; title; taggedUserIds; clientCapturedAt: Date | null; now: Date }): Promise<boolean>` (conditional on `status = 'pending'`).
  - service (`createUploadsService({ db, storage, jobs, clock })`):
    - `getQuota(m: Membership): Promise<UploadQuota>` — limit `DEFAULT_UPLOAD_QUOTA_PER_DAY` (Plan 4 makes it a league setting).
    - `createUpload(m, body: CreateUploadBody): Promise<CreateUploadResponse>` — transaction: `lockMemberRow`, count (`since = uploadQuotaWindowStart(now)`, `pendingSince = now − UPLOAD_PRESIGN_TTL_SECONDS`), `checkUploadQuota({ requested: 1 })` denied → `AppError('UPLOAD_QUOTA_EXCEEDED', 429, ..., { limit, remaining })`, `insertUpload` with key `incoming/{userId}/{uploadId}`; then `storage.presignUpload({ contentType: UPLOAD_CONTENT_TYPE, minBytes: UPLOAD_MIN_BYTES, maxBytes: UPLOAD_MAX_BYTES, cacheControl: 'no-store', expiresInSeconds: UPLOAD_PRESIGN_TTL_SECONDS })`.
    - `completeUpload(m, uploadId, body: CompleteUploadBody): Promise<UploadState>` — upload not found or not owned by `m.userId` → 404; status ≠ `pending` → return the current state unchanged (idempotent, no second enqueue); every `taggedUserIds` entry must be a league member (else 400 `VALIDATION_FAILED` with `details.field = 'taggedUserIds'`); `storage.head(objectKey)` null → 409 `UPLOAD_NOT_READY`; `markUploaded` with `sanitizeCaptureDate(body.capturedAt, now)`; then `jobs.enqueueMediaProcess({ uploadId })`. Returns `{ status: 'uploaded', cardId: null, rejectionReason: null }`.
    - `getUploadState(m, uploadId): Promise<UploadState>` (owner only, else 404).
  - Routes (all `authenticate` + `requireLeagueRole('member')`, outputs validated):
    - `GET /api/leagues/:leagueId/uploads/quota` → `UploadQuota`
    - `POST /api/leagues/:leagueId/uploads` (`rateLimits.uploadCreate`) → 201 `CreateUploadResponse`
    - `POST /api/leagues/:leagueId/uploads/:uploadId/complete` → 202 `UploadState`
    - `GET /api/leagues/:leagueId/uploads/:uploadId` → `UploadState`

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify** (cookies of `tristan` in `/tmp/storix-a.txt`, `H='-H Origin:http://localhost:5180 -H Content-Type:application/json'`, `L=<league id>`):
  - `GET .../uploads/quota` → `{"limit":10,"used":0,"remaining":10}`.
  - `POST .../uploads -d '{"contentType":"image/jpeg","size":200000}'` → 201; POST the returned fields + a real JPEG to `url` → 204; `POST .../complete -d '{"title":"Raclette chez Tom","taggedUserIds":[],"capturedAt":"2017-03-03T12:00:00.000Z"}'` → 202 `status: "uploaded"`; repeat `complete` → 202 same state, and `psql -c "select count(*) from pgboss.job where name='media.process'"` (verify the v12 table name) shows one job (Review Focus 5).
  - `complete` on a fresh presign without uploading the file → 409 `UPLOAD_NOT_READY`; with a non-member id in `taggedUserIds` → 400.
  - `contentType: "image/png"` or `size: 16000000` → 400 `VALIDATION_FAILED`.
  - Quota race (Review Focus 4): reset with `psql -c 'delete from uploads'`, then `seq 11 | xargs -P 11 -I{} curl -s -o /dev/null -w '%{http_code}\n' -b /tmp/storix-a.txt $H -d '{"contentType":"image/jpeg","size":1000}' localhost:3020/api/leagues/$L/uploads | sort | uniq -c` → `10 201` and `1 429`.
  - As a user from another league → 404 on every route.
- [ ] **Step 3: Commit** (after go-ahead): `feat(api): add presigned uploads with daily quota and processing jobs`

---

### Task 7: Worker — media processing with sharp and pg-boss

**Files:**
- Create: `apps/worker/{package.json,tsconfig.json,tsdown.config.ts}`, `apps/worker/src/{main.ts,config/env.ts,lib/logger.ts}`, `apps/worker/src/jobs/{media-process.job,media-sweep.job}.ts`, `apps/worker/src/features/media/{media-processing.service,media-sweep.service,media.repository,image-pipeline}.ts`
- Modify: `pnpm-workspace.yaml` (`allowBuilds` entry for `sharp` only if its install requires it at the pinned version), `AGENTS.md`

**Interfaces:**
- Consumes: `ObjectStorage`; `perceptualHash`, `findDuplicate`, `sanitizeCaptureDate`, `mediaVariantKey`, `MEDIA_VARIANT_SIZES`, `MEDIA_FORMATS`, `PHASH_SIZE`, `UPLOAD_MAX_BYTES`, `PROVISIONAL_TIER`; `mediaProcessPayloadSchema`, `MEDIA_PROCESS_JOB`, `MEDIA_SWEEP_JOB`, `MediaVariant`; db tables (Task 3).
- Produces:
  - `@storix/worker` package: deps `pg-boss`, `sharp`, `thumbhash`, `exifr`, `pino`, `zod`, `drizzle-orm`, `@storix/db`, `@storix/shared`, `@storix/storage`; dev `tsx`, `pino-pretty`, `tsdown`; scripts `dev: tsx watch --env-file=../../.env src/main.ts`, `build: tsdown`, `start: node dist/main.js`, `typecheck`.
  - `config/env.ts`: `loadWorkerEnv(source): WorkerEnv` — `NODE_ENV`, `DATABASE_URL`, `LOG_LEVEL`, `MEDIA_CONCURRENCY` (coerce int, default 2) + `storageEnvSchema`.
  - `image-pipeline.ts` (the only sharp/thumbhash/exifr importer):
    - `probeJpeg(buffer: Buffer): Promise<{ width: number; height: number } | null>` — null unless the first bytes are `FF D8 FF` and sharp reports format `jpeg`; sharp opened with `limitInputPixels: 50_000_000`, `failOn: 'error'`.
    - `readExifCaptureDate(buffer: Buffer): Promise<Date | null>` — exifr `DateTimeOriginal` (then `CreateDate`), never throws.
    - `grayscaleForHash(buffer: Buffer): Promise<Uint8Array>` — `.rotate().grayscale().resize(32, 32, { fit: 'fill' }).raw()`.
    - `renderVariants(buffer: Buffer): Promise<{ width: number; height: number; thumbhash: string; dominantColor: string; files: Array<{ size: MediaVariantSize; format: MediaFormat; body: Buffer; width: number; height: number; contentType: string }> }>` — base pipeline `.rotate()` (applies orientation, output never keeps metadata: no `withMetadata`/`keepMetadata`); each size `resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })`; AVIF `{ quality: 50, effort: 4 }`, WebP `{ quality: 78 }`; thumbhash from a ≤ 100 px RGBA raw render (`rgbaToThumbHash`, base64); dominant color from `stats().dominant` as `#rrggbb`. `sharp.concurrency(1)` and `sharp.cache(false)` set once in `main.ts`.
  - repository: `findUploadForProcessing(db, uploadId)`, `markUploadProcessing(db, uploadId): Promise<boolean>` (from `uploaded|processing`), `markUploadRejected(db, uploadId, reason, now)`, `markUploadFailed(db, uploadId, now)`, `markUploadReady(db, uploadId, cardId, now)`, `lockLeagueMedia(db, leagueId)` (`select pg_advisory_xact_lock(hashtext($leagueId))`), `findMediaBySha(db, leagueId, sha)`, `listLeaguePhashes(db, leagueId): Promise<Array<{ mediaId: string; phash: string; sourceSha256: string }>>`, `nextCardNumber(db, leagueId): Promise<number>` (`coalesce(max(number), 0) + 1`), `insertMedia(db, row)`, `insertCard(db, row)`, `insertCardTags(db, cardId, userIds)`, `findStaleUploads(db, input: { pendingBefore: Date; uploadedBefore: Date }): Promise<Array<{ id; status; objectKey }>>`, `deleteUploads(db, ids)`; audit via a worker-local `insertAuditEntry` equivalent (action `card.created`).
  - `createMediaProcessingService({ db, storage, pipeline, clock, logger })` → `processUpload(uploadId: string, input: { isFinalAttempt: boolean }): Promise<void>`:
    1. Upload missing or status not `uploaded|processing` → return (idempotent). `markUploadProcessing`.
    2. `storage.getBuffer(objectKey, UPLOAD_MAX_BYTES)`; null or `probeJpeg` null → reject `INVALID_IMAGE`.
    3. `sourceSha256` = sha256 hex of the bytes; `findMediaBySha` hit → reject `DUPLICATE_PHOTO`.
    4. `phash = perceptualHash(await grayscaleForHash(buffer))`; pre-check `findDuplicate` over `listLeaguePhashes` → reject `DUPLICATE_PHOTO` (cheap exit before rendering).
    5. `capturedAt = sanitizeCaptureDate(exif ?? clientCapturedAt, now)`, source `exif` | `client` | null.
    6. `renderVariants`, then `storage.put` each file at `mediaVariantKey(...)` with `cacheControl: 'public, max-age=31536000, immutable'`.
    7. Transaction: `lockLeagueMedia`, re-run the sha and pHash duplicate checks (another job may have committed meanwhile); duplicate → mark rejected and, after commit, delete the six variant keys ONLY when the duplicate's `sourceSha256` differs from ours (same sha = same keys = the existing card's files); otherwise `insertMedia`, `nextCardNumber`, `insertCard` (`tier: PROVISIONAL_TIER`, `isProvisional: true`, `authorId` = uploader, title from the upload), `insertCardTags`, audit `card.created`, `markUploadReady`.
    8. Delete the `incoming/` object (also after a rejection).
    Unexpected errors propagate; when `isFinalAttempt`, mark the upload `failed` and delete the incoming object first.
  - `createMediaSweepService({ db, storage, clock, enqueueMediaProcess: (payload: MediaProcessPayload) => Promise<void> })` (the callback is built in `main.ts` from `boss.send` with the same options as the API's `JobQueue`) → `sweep(): Promise<void>`: `pending` uploads older than 1 h → delete objects + rows; `uploaded` uploads older than 10 min → re-enqueue `media.process` (lost enqueue after `complete`).
  - jobs: `registerMediaProcessJob(boss, service, logger)` — `boss.work(MEDIA_PROCESS_JOB, { batchSize: 1, localConcurrency: env.MEDIA_CONCURRENCY }, handler)` (verify v12 option names and the array-of-jobs handler), payload parsed with `mediaProcessPayloadSchema`, `isFinalAttempt` from the job's retry count vs `retryLimit`; `registerMediaSweepJob` — `boss.schedule(MEDIA_SWEEP_JOB, '*/15 * * * *')` + `work`.
  - `main.ts`: env, pino, db, storage, `new PgBoss({ connectionString, schema: 'pgboss' })`, `start`, `createQueue` both, register jobs, `SIGTERM`/`SIGINT` → `boss.stop({ graceful: true, timeout: 30_000 })`, close db.
  - `tsdown.config.ts`: entry `src/main.ts`, ESM, platform node, workspace `@storix/*` bundled, npm deps external (same option as the api's config).

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Register with Portly.** `portly status --json`; `portly add-server --project storix --name worker --command 'pnpm --filter @storix/worker dev' --start --json` (no port); poll until running; `AGENTS.md` lists `storix/worker`.
- [ ] **Step 3: Verify.**
  - Repeat Task 6's presign + POST + complete with a phone JPEG that has GPS EXIF uploaded as-is (bypassing the web client) → within ~10 s `GET .../uploads/:id` → `status: "ready"`, `cardId` set; `psql` shows one `cards` row `number = 1`, `is_provisional = t`, a `media` row with 6 `variants`, `capture_date_source = 'exif'`; `docker compose run --rm --entrypoint sh minio-init -c "mc alias set local http://minio:9000 storix storix-dev-secret && mc ls --recursive local/storix-media"` shows the 6 `img/` keys and no `incoming/` key.
  - Metadata stripped: download the 1600 webp through a signed `/media` URL and run `pnpm --filter @storix/worker exec tsx -e "<sharp(file).metadata() → print exif, icc, xmp>"` → `exif` and `xmp` undefined; `exiftool` (if installed) shows no GPS.
  - `mc stat` on a variant → `Cache-Control: public, max-age=31536000, immutable`.
  - Same file again → `rejected` / `DUPLICATE_PHOTO`. The same photo re-encoded (`sharp(file).jpeg({ quality: 60 }).resize(1200)`) → `DUPLICATE_PHOTO` (Review Focus 1). A different photo → `ready`, card `number = 2`.
  - Concurrency (Review Focus 1): presign + upload two different re-encodings of a new photo, call both `complete` in parallel (`xargs -P 2`) → exactly one `ready`, one `DUPLICATE_PHOTO`, and the ready card's six objects still exist.
  - A text file renamed `.jpg` (passes the presign since the type is declared) → `INVALID_IMAGE`.
  - Stop the worker (`portly stop storix/worker --json`), complete an upload, start it → the job is processed.
  - `pnpm lint && pnpm typecheck` clean.
- [ ] **Step 4: Commit** (after go-ahead): `feat(worker): process uploaded photos into card media with sharp and pg-boss`

---

### Task 8: Cards API — paginated league collection and card detail

**Files:**
- Create: `apps/api/src/features/cards/{cards.routes,cards.service,cards.repository,image-set}.ts`
- Modify: `apps/api/src/deps.ts`, `apps/api/src/app.ts`

**Interfaces:**
- Consumes: `MediaSigner.urlFor`; card schemas (Task 2); `requireLeagueRole`.
- Produces:
  - `image-set.ts`: `toImageSet(variants: readonly MediaVariant[], sizes: readonly MediaVariantSize[], signer: MediaSigner): ImageSet` — per format, the selected sizes ascending by width, `url = signer.urlFor(variant.key)`, `width = variant.width`.
  - repository: `listCards(db, input: { leagueId; authorId?: string; beforeNumber?: number; limit: number }): Promise<CardRow[]>` (status `active`, order `number desc`, joins media + author display name, fetches `limit + 1` to detect a next page), `countCards(db, { leagueId; authorId? }): Promise<number>`, `findCard(db, leagueId, cardId): Promise<CardDetailRow | null>` (+ tagged members' display names).
  - service: `listCards(m: Membership, query: ListCardsQuery): Promise<CardPage>` (summary image sets = sizes `[256, 768]`; `nextCursor` = last returned `number` when more rows exist), `getCard(m, cardId): Promise<CardDetail>` (sizes `[256, 768, 1600]`; unknown or other league → 404).
  - Routes (`authenticate` + `requireLeagueRole('member')`): `GET /api/leagues/:leagueId/cards` (querystring `listCardsQuerySchema`) → `CardPage`; `GET /api/leagues/:leagueId/cards/:cardId` → `CardDetail`.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify:** `GET .../cards` → the cards from Task 7, newest first, `total` correct, every `image.avif[].url` starts with `/media/<today's window>/`; two calls a second apart return byte-identical URLs (`diff` of the two bodies is empty); `?authorId=<max id>` → only max's cards; `?limit=1` → `nextCursor` set, `?limit=1&cursor=<it>` → the next card; detail → 3 sizes per format, `tagged` names, `capturedAt`; a URL from the response loads with `curl -sI` (200, `immutable`).
- [ ] **Step 3: Commit** (after go-ahead): `feat(api): add league card collection and card detail endpoints`

---

### Task 9: Web — Card face, Collection grid, member filter

**Files:**
- Create: `apps/web/src/features/cards/{cards.api.ts,cards.queries.ts,tier-labels.ts,card-number.ts}`, `apps/web/src/features/cards/components/{card-face,card-image,collection-grid,member-filter}.tsx`, `apps/web/src/components/ui/{segmented,chip}.tsx`
- Modify: `apps/web/src/routes/_authed/l.$leagueId.collection.tsx`, `apps/web/src/components/ui/bottom-nav.tsx` (`sticky bottom-0 z-10`), `apps/web/src/routes/_authed/l.$leagueId.admin.tsx` (use `Segmented` instead of its inline control), `apps/web/src/styles/app.css`, `apps/web/package.json` (deps `@tanstack/react-virtual`, `thumbhash`)

**Interfaces:**
- Consumes: card routes (Task 8), `membersQueryOptions`, `cardPageSchema`, `cardDetailSchema`.
- Produces:
  - `cards.queries.ts`: `cardsInfiniteQueryOptions(leagueId: string, authorId: string | null)` — key `['leagues', leagueId, 'cards', { authorId }]`, `initialPageParam: undefined`, `getNextPageParam: (page) => page.nextCursor ?? undefined`; `cardDetailQueryOptions(leagueId, cardId)` — key `['leagues', leagueId, 'cards', 'detail', cardId]`.
  - `tier-labels.ts`: `TIER_LABELS: Record<CardTier, string>` = Commune, Peu commune, Rare, Épique, Légendaire, Mythique; `TIER_CLASS: Record<CardTier, string>` = `t-C t-U t-R t-E t-L t-M`.
  - `card-number.ts`: `formatCardNumber(n: number): string` → `#047`.
  - `CardImage { image: ImageSet; thumbhash: string; width: number; height: number; sizes: string; alt: string; isEager?: boolean }` — `<picture>` with AVIF then WebP `<source srcSet>` (`url widthw`), `<img>` fallback = largest WebP, `loading="lazy"` unless `isEager`, `decoding="async"`, `width/height` attributes, `object-fit: cover`; the thumbhash data URL (`thumbHashToDataURL`, memoized) as the container background; image fades in on load (no transition under reduced motion).
  - `CardFace { size: 'sm' | 'md' | 'lg' | 'xl'; title: string; tier: CardTier; isProvisional: boolean; children: ReactNode /* the art */; holoRef?: Ref<HTMLDivElement> }` — mockup structure `.card.{size}.t-X > .card-art + .card-holo + .card-gem + .card-band(.card-name, .card-tier)`; tier line = `TIER_LABELS[tier]` (+ " · provisoire" when provisional).
  - `Chip { label: string; initials?: string; isOn: boolean; onToggle(): void }` — mockup `.chip` (44 high, pill, avatar 32, on = bg ink / text bg); `Segmented<T extends string> { options: readonly { id: T; label: string }[]; value: T; onChange(id: T): void }` — mockup `.seg`.
  - `MemberFilter { members: MemberSummary[]; selectedId: string | null; onSelect(id: string | null): void }` — horizontal scrolling chips "Toutes" + one per member.
  - `CollectionGrid { leagueId: string; authorId: string | null }` — `useSuspenseInfiniteQuery`, `useWindowVirtualizer` over rows of 3 (`count = ceil(cards / 3)`, `estimateSize = cardWidth × 88 / 63 + 12`, card width from a `ResizeObserver` on the grid container, `overscan: 3`, `scrollMargin` = the grid's offset top); fetch the next page when the last rendered row index ≥ rowCount − 2; each card is a `<Link to="/l/$leagueId/cards/$cardId">` wrapping `CardFace size="md"` + `CardImage` (`sizes="(max-width: 480px) 31vw, 140px"`); the first visible row uses `isEager`.

CSS (`app.css`, values from the mockup): `.card` radius 12, bg surface-2, `box-shadow: 0 0 0 2px var(--tc)`; sizes sm 80×112 (radius 10), md fluid width with `aspect-ratio: 63 / 88` in the grid (108×151 in the add preview), lg 220×308 and xl 236×330 (radius 18); `.card-gem` 8px dot top/right 7px with `0 0 8px var(--tc)`; `.card-band` bottom bar `rgba(10,10,16,.8)` padding 6px 8px (lg/xl 12px 14px), `.card-name` Space Grotesk 600 11px (lg/xl 17px) ellipsis, `.card-tier` 9px (lg/xl 11px) uppercase tracking .08em color `--tc`; tier vars `--tc`: C `#A1A1AA`, U `#4ADE80`, R `#60A5FA`, E `#C084FC`, L `#FBBF24`, M rainbow (`--tc: #C084FC` + animated conic border via `.t-M::before`). `.card-holo` gradients: E and L as in the mockup (`.t-E .card-holo`, `.t-L .card-holo` incl. `mix-blend-mode: overlay` and `animation: shine 4.5s`), M = L's gradient with full spectrum; C/U/R have no static holo layer.

Screen `l.$leagueId.collection.tsx` (search schema `z.object({ author: z.string().optional() })`):
- `.title-row`: h1 "Collection" + `.count-big` "<strong>N</strong> cartes" (from the first page's `total`).
- `MemberFilter` (selection writes `?author=`), then `.sub-title` "Cartes de Léa · N" or "Toutes les cartes · N".
- `CollectionGrid`; zero cards → `EmptyState` "Aucune carte pour l'instant" / "Ajoute tes premières photos pour créer des cartes." + primary link "Ajouter des photos" → add route. The "Par membre / Par rareté" segmented control and the progress bar arrive with rarities and ownership in Plan 3.
- The bottom nav is sticky so it stays visible over the long grid.

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify in the browser:** collection lists the created cards newest first in 3 columns matching the mockup (ring color, band, gem); filter by member updates the URL and the count; with 300+ cards (seed by repeating Task 7 uploads with distinct generated images, e.g. a throwaway loop rendering random gradients with sharp) scrolling stays smooth (DevTools Performance: no long tasks > 50 ms while flinging) and the DOM holds only ~10 rows; thumbhash placeholders show before images on a throttled "Slow 4G" profile; Network shows AVIF requests on Chrome; CLS in a Lighthouse run < 0.05.
- [ ] **Step 3: Commit** (after go-ahead): `feat(web): add virtualized collection grid with member filter`

---

### Task 10: Web — Add photos screen

**Files:**
- Create: `apps/web/src/features/uploads/{uploads.api.ts,prepare-photo.ts,use-photo-drafts.ts,use-create-cards.ts,use-upload-quota.ts}`, `apps/web/src/features/uploads/components/{photo-picker,draft-thumbs,draft-editor,member-tag-chips}.tsx`
- Modify: `apps/web/src/routes/_authed/l.$leagueId.add.tsx`, `apps/web/package.json` (dep `exifr`)

**Interfaces:**
- Consumes: upload routes (Task 6), `CardFace` and `Chip` (Task 9), `membersQueryOptions(leagueId)`, `apiRequest`, `errorMessage`, `CLIENT_MAX_EDGE_PX`, `UPLOAD_CONTENT_TYPE`, `cardTitleSchema`.
- Produces:
  - `prepare-photo.ts`: `preparePhoto(file: File): Promise<PreparedPhoto>`; `interface PreparedPhoto { blob: Blob; width: number; height: number; capturedAt: string | null; previewUrl: string }` — EXIF first (`exifr.parse(file, { pick: ['DateTimeOriginal'] })`, failures → null), decode with `createImageBitmap(file, { imageOrientation: 'from-image' })`, falling back to an `HTMLImageElement` + `decode()` (Safari HEIC path); draw on a canvas scaled so the longest edge ≤ `CLIENT_MAX_EDGE_PX`; `canvas.toBlob(UPLOAD_CONTENT_TYPE, 0.9)`; `previewUrl = URL.createObjectURL(blob)` (revoked when the draft is removed or the screen unmounts). Undecodable → `UserFacingError('Format non pris en charge sur cet appareil.')`.
  - `uploads.api.ts`: `fetchUploadQuota(leagueId)`, `createUpload(leagueId, body)`, `postToBucket(target: { url: string; fields: Record<string, string> }, blob: Blob): Promise<void>` (FormData: every field first, `file` last; plain `fetch`, no credentials; non-2xx → `UserFacingError("L'envoi de la photo a échoué.")`), `completeUpload(leagueId, uploadId, body)`, `fetchUploadState(leagueId, uploadId)`.
  - `useUploadQuota(leagueId)` — query key `['leagues', leagueId, 'uploads', 'quota']`.
  - `usePhotoDrafts()` — `useReducer`; `interface PhotoDraft { id: string; photo: PreparedPhoto | null; title: string; taggedUserIds: readonly string[]; phase: 'preparing' | 'ready' | 'sending' | 'processing' | 'created' | 'duplicate' | 'error'; errorMessage: string | null; cardId: string | null }`; actions `add(files: File[])` (caps the batch at the remaining quota and reports the overflow), `remove(id)`, `select(id)`, `setTitle(id, title)`, `toggleTag(id, userId)`, `setPhase(id, phase, extra?)`; selected draft id.
  - `useCreateCards(leagueId, drafts)` → `{ start(): void; isRunning: boolean; isDone: boolean }` — for each `ready` draft, at most 2 in parallel: `createUpload` → `postToBucket` → `completeUpload` → poll `fetchUploadState` every 1.5 s (max 2 min) until `ready` (`created`), `rejected` (`DUPLICATE_PHOTO` → `duplicate`, `INVALID_IMAGE` → `error` "Cette photo n'a pas pu être lue."), `failed` (`error`). Network failures (`TypeError` from fetch or `navigator.onLine === false`) keep the draft `ready` with message "Hors ligne, nouvel essai dès le retour du réseau." and re-run on the `online` event while the screen is mounted; a draft that already reached `complete` resumes at polling (never re-presigns). On finish: invalidate `['leagues', leagueId, 'cards']` and the quota key.

Screen `l.$leagueId.add.tsx` (mockup "5 · Ajout de photos"):
- No drafts: TopBar title "Nouvelles cartes", quota line "Il te reste N photos aujourd'hui" (13px muted), `PhotoPicker` = hidden `<input type="file" accept="image/*" multiple>` behind a primary block button "Choisir des photos" (the OS sheet offers camera and gallery). Remaining 0 → `EmptyState` "Limite atteinte" / "Tu pourras ajouter d'autres photos demain."
- With drafts: TopBar with close button (back to collection) and title "Nouvelles cartes · N photos"; `DraftThumbs` grid (4 columns, gap 6, square, radius thumb; selected = 2px accent ring + numbered check 22px accent; overlay per phase: spinner while preparing/sending/processing, check when created, "Doublon" / "Erreur" label otherwise) + a last "+" tile while under quota.
- `DraftEditor` for the selected draft: `.preview` row = `CardFace size="md"` preview (Task 9 component, image from `previewUrl`, tier `common`) + field "Titre de la carte · i / N" (max 40, counter) + `.est` box "Rareté calculée à la création" (placeholder until Plan 3); "Qui est sur la photo ?" + wrapped member chips (exclude nobody, self included); `.info` rows: "Prise le 3 mars 2017" (`Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' })`) or "Date de prise inconnue", and "Position GPS supprimée avant l'envoi".
- Primary block "Créer N cartes" (N = drafts in `ready`), disabled while any title is invalid or a draft is preparing; while running: "Création…"; when done: summary "N cartes créées" (+ "M doublons" if any) and primary "Voir la collection".

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify in the browser** (`http://localhost:5180`, logged in as tristan):
  - Pick 3 JPEGs → thumbs, titles, tags; "Créer 3 cartes" → each reaches the check; `psql` shows 3 new cards with their titles and `card_tags`.
  - DevTools Network: the bucket POST goes to `localhost:9100` with `file` last and returns 204; the payload is ≤ 2048 px (check one blob's dimensions in the preview or the variant `width` of its 1600 render ≤ 1600 and source ≤ 2048).
  - Re-pick one of them → "Doublon".
  - Review Focus 2: on an iPhone (Safari via the prod preview in Task 13, or now through a LAN-exposed URL if available) a HEIC portrait photo becomes an upright card with its capture date; on desktop Chrome a `.heic` file shows "Format non pris en charge sur cet appareil." on its thumb.
  - Review Focus 5: DevTools "Offline" during sending → message on the thumbs; back online → they finish, no duplicate card rows.
  - With 9 uploads used today, pick 3 photos → only 1 draft is added and a notice explains the limit.
- [ ] **Step 3: Commit** (after go-ahead): `feat(web): add multi-photo upload screen turning photos into cards`

---

### Task 11: Web — Card detail with holo tilt

**Files:**
- Create: `apps/web/src/routes/_authed/l.$leagueId.cards.$cardId.tsx`, `apps/web/src/features/cards/use-holo-tilt.ts`, `apps/web/src/features/cards/components/card-detail.tsx`
- Modify: `apps/web/src/styles/app.css`

**Interfaces:**
- Consumes: `cardDetailQueryOptions`, `CardFace`, `CardImage`, `TIER_LABELS`, `formatCardNumber`.
- Produces:
  - `useHoloTilt(): { ref: RefCallback<HTMLElement>; needsMotionPermission: boolean; requestMotionPermission(): Promise<void> }` — sources: pointer move/leave on the element and `deviceorientation` (`gamma` → `ry = clamp(gamma, −30, 30) / 30 × 12deg`, `beta − 45` → `rx = −clamp(…, −30, 30) / 30 × 12deg`; pointer maps the position over the element to the same ±12deg range). The latest sample is stored in a ref and written once per `requestAnimationFrame` as CSS variables on the element: `--rx`, `--ry` (deg), `--mx`, `--my` (0-100%), `--glare` (0-1). No React state per frame. Disabled entirely (vars stay at rest values, no listeners) when `matchMedia('(prefers-reduced-motion: reduce)')` matches. `needsMotionPermission` = `typeof DeviceOrientationEvent.requestPermission === 'function'` and not yet granted; `requestMotionPermission` must be called from a click handler. Listeners and the rAF are removed on unmount and when the tab is hidden.
  - CSS: `.tilt { perspective: 900px }`, `.tilt .card { transform: rotateX(var(--rx, 6deg)) rotateY(var(--ry, -12deg)); transition: transform .2s ease-out }` (rest pose = mockup `.tilt` pose), `.tilt .card-holo` background-position from `--mx`/`--my`, plus a radial glare `radial-gradient(circle at var(--mx) var(--my), rgba(255,255,255,calc(var(--glare) * .35)), transparent 55%)` for every tier; legendary/mythic tilt shadow from the mockup (`0 0 0 2px #FBBF24, 0 24px 50px rgba(0,0,0,.6), 0 0 40px rgba(251,191,36,.25)` with the tier color).

Screen (mockup "4 · Détail d'une carte"): TopBar with back (to collection, keeping `?author`) and title "Carte #047"; `.tilt` + `CardFace size="xl"` + `CardImage` (sizes `236px`, `isEager`) with the hook's ref; `.pills`: tier pill (gold variant for legendary/mythic) and "Provisoire" when provisional; `.detail-name` title (Space Grotesk 700 22px centered); `.meta` 2×2 cells: "Photo de" (author or "Ancien membre"), "Prise le" (date or "Inconnue"), "Ajoutée le" (createdAt), "Sur la photo" (tagged names or "Personne"); when `needsMotionPermission`, a ghost button "Activer l'effet holo" calling `requestMotionPermission`. Reactions, discoverer, copies and actions arrive in Plan 3. Unknown card → `EmptyState` "Carte introuvable".

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify in the browser:** tapping a grid card opens the detail with the 1600 image (Network); moving the pointer tilts the card and moves the glare smoothly (DevTools Performance: no React commits while moving); with "Emulate prefers-reduced-motion: reduce" the card stays in its rest pose; DevTools Sensors orientation changes tilt it; on an iPhone (Task 13 prod preview) "Activer l'effet holo" shows, the permission prompt appears on tap, then tilting the phone moves the card.
- [ ] **Step 3: Commit** (after go-ahead): `feat(web): add card detail with tilt-driven holo effect`

---

### Task 12: Web — Service worker media cache, offline collection, storage persistence

**Files:**
- Create: `apps/web/src/features/pwa/persist-storage.ts`
- Modify: `apps/web/src/sw.ts`, `apps/web/src/main.tsx`, `apps/web/src/features/auth/use-logout.ts`

**Interfaces:**
- Consumes: `mediaCacheKey` (Task 1).
- Produces:
  - `sw.ts` runtime routes (registered before the navigation route):
    - Media: match `url.origin === self.location.origin && url.pathname.startsWith('/media/')`; `CacheFirst` with cache name `storix-media-v1`, plugins: `{ cacheKeyWillBeUsed: ({ request }) => mediaCacheKey(new URL(request.url).pathname) ?? request.url }`, `CacheableResponsePlugin({ statuses: [200] })`, `ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 30 * 24 * 3600, purgeOnQuotaError: true })`.
    - API reads: `GET` on `/api/leagues/:id/cards` and `/api/leagues/:id/cards/:cardId` (regex on the pathname, query included in the key) → `StaleWhileRevalidate` cache `storix-api-v1`, `CacheableResponsePlugin({ statuses: [200] })`, `ExpirationPlugin({ maxEntries: 100 })`. No other `/api/*` route is cached (never auth, uploads or, later, boosters).
  - `persist-storage.ts`: `requestPersistentStorage(): Promise<void>` — calls `navigator.storage.persist()` once when supported and not already persisted; logs the result through `logger.info`. Called from `main.tsx` after `registerServiceWorker()` in production.
  - `useLogout`: after sign-out, `await caches.delete('storix-api-v1')` (guarded by `'caches' in window`); media stays cached (unguessable keys, Plan 4 purges withdrawn cards).

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Verify** on the prod preview (Task 13 brings the full stack up; run this check there, after its Step 3): open the collection, scroll to load images, DevTools > Application > Cache Storage `storix-media-v1` holds entries keyed `/media/img/...` (no window/signature segments) with status 200 (not opaque); tick "Offline" and reload `/l/<id>/collection` → grid and images render; change the system clock forward one day (or re-sign with a new `MEDIA_URL_SECRET` window) and reload online → images come from the cache without network fetches for already-cached keys; log out → `storix-api-v1` is gone.
- [ ] **Step 3: Commit** (after go-ahead): `feat(web): cache media and collection reads offline in the service worker`

---

### Task 13: Production build — migrations, worker build, full local prod preview

**Files:**
- Create: `apps/api/src/cli/migrate.ts`
- Modify: `apps/api/tsdown.config.ts` (entries `src/server.ts`, `src/cli/migrate.ts`, `src/cli/bootstrap.ts`), `apps/api/package.json`, root `package.json`, `apps/api/src/http/static.ts`, `README.md`, `.env.preview` (local)

**Interfaces:**
- Produces:
  - `cli/migrate.ts`: runs `migrate(drizzle(pool), { migrationsFolder })` from `drizzle-orm/node-postgres/migrator`, `migrationsFolder = resolve(process.cwd(), process.env.MIGRATIONS_DIR ?? 'packages/db/drizzle')`, logs through pino, exits non-zero on failure. Built to `apps/api/dist/migrate.js` (no drizzle-kit needed at runtime).
  - `apps/api/dist/bootstrap.js` built from the existing CLI (it already reads `BOOTSTRAP_PASSWORD` from env).
  - Root scripts: `build:api` (`pnpm --filter @storix/web build && pnpm --filter @storix/api build`), `build:worker` (`pnpm --filter @storix/worker build`), `build` (both), `start` (`node apps/api/dist/server.js`), `start:worker` (`node apps/worker/dist/main.js`), `migrate:prod` (`node apps/api/dist/migrate.js`), `preview:prod` unchanged.
  - `static.ts`: `sw.js`, `index.html`, `manifest.webmanifest` switch from `no-cache` to `no-store` so the Railway CDN can never serve a stale shell after a deploy (the SW precache keeps the shell offline).
  - README: MinIO + worker in setup, `storix/worker` Portly server, new env vars, upload/media architecture (presigned POST, worker pipeline, `/media` windowed HMAC, CDN, SW cache key), production section rewritten for Railway (services, commands, variables, CDN, custom domain steps).

- [ ] **Step 1: Implement.**
- [ ] **Step 2: Build check.** `pnpm build` → `apps/api/dist/{server,migrate,bootstrap}.js`, `apps/worker/dist/main.js`, `apps/web/dist/sw.js` exist; `node apps/api/dist/migrate.js` against the local DB → "no pending migrations" style log, exit 0.
- [ ] **Step 3: Prod preview.** `.env.preview` gains the S3 and `MEDIA_URL_SECRET` values. `portly start storix/prod-preview --json` (and `storix/worker` running) → poll healthy.
- [ ] **Step 4: Verify on `http://localhost:3021`:** log in, add 2 photos, see them in the collection and the detail; `curl -sI localhost:3021/sw.js | grep -i cache-control` → `no-store`; response CSP header contains `connect-src 'self' http://localhost:9100`; run Task 12 Step 2 here; on an iPhone on the same network (if reachable) run the Task 10 HEIC and Task 11 gyroscope checks, otherwise defer them to Task 14 on production. `pnpm lint && pnpm typecheck && pnpm test` clean. `portly stop storix/prod-preview --json`.
- [ ] **Step 5: Commit** (after go-ahead): `chore(repo): build api, migrations and worker for production`

---

### Task 14: First production deploy on Railway

Use the Railway CLI only (the Railway MCP is unauthorized in this session); prefix every call with `RAILWAY_CALLER="skill:use-railway@1.2.1" RAILWAY_AGENT_SESSION=<one id for the whole task>`; prefer explicit `--service` / `--environment production` flags; run `railway <cmd> --help` before any subcommand whose flags this task does not pin. Secrets go through `--stdin`, never on the command line or in the repo.

**Files:**
- Modify: `README.md` (production values actually used, DNS instructions), `.env.example` (no secrets)

**Interfaces:**
- Consumes: `build:api`, `build:worker`, `start`, `start:worker`, `migrate:prod` (Task 13), `set-cors` CLI (Task 4), bootstrap CLI (Plan 1).

- [ ] **Step 1: Preflight.** `railway whoami --json`; `railway link --project storix` (or pass `--project` everywhere); `railway status --json`; `railway bucket list --json` shows `storix-media`; `railway bucket credentials --bucket storix-media --json` → note `bucketName`, `endpoint`, `region` (do not print the secret in the report).
- [ ] **Step 2: Git.** On `feat/photos-cards` with a clean tree: `git checkout feat/foundation && git merge --no-ff feat/photos-cards`, `git checkout main && git merge --no-ff feat/foundation`, `git push origin main feat/foundation feat/photos-cards`. (Authorized by Tristan; no force push.)
- [ ] **Step 3: Postgres.** `railway add --database postgres --json`; read back with `railway service list --json` (service name, usually `Postgres`).
- [ ] **Step 4: Services.** `railway add --service api --repo TristanHourtoulle/storix --branch main --json` and the same for `worker` (if `--repo` cannot be set at creation, create empty services and set `source.repo` / `source.branch` with `railway environment edit --service-config`). Then for each with `railway environment edit --service-config <svc> <key> <value>`:
  - api: `build.builder RAILPACK`, `build.buildCommand "pnpm build:api"`, `deploy.startCommand "pnpm start"`, `deploy.preDeployCommand "pnpm migrate:prod"`, `deploy.healthcheckPath /api/health`, `deploy.restartPolicyType ON_FAILURE`, `build.watchPatterns '["apps/api/**","apps/web/**","packages/**","pnpm-lock.yaml","package.json"]'`.
  - worker: `build.builder RAILPACK`, `build.buildCommand "pnpm build:worker"`, `deploy.startCommand "pnpm start:worker"`, `deploy.restartPolicyType ON_FAILURE`, `build.watchPatterns '["apps/worker/**","packages/**","pnpm-lock.yaml","package.json"]'`.
  - Use `--stage` on all but the last edit per service if the CLI supports it, so one deploy is triggered.
- [ ] **Step 5: Domain.** `railway domain --service api --json` → note `<railway-domain>` (e.g. `api-production-xxxx.up.railway.app`); `APP_ORIGIN = https://<railway-domain>`.
- [ ] **Step 6: Variables** (`railway variable set ... --service <svc> --skip-deploys`, secrets via `--stdin`):
  - both: `NODE_ENV=production`, `LOG_LEVEL=info`, `RAILPACK_NODE_VERSION=24`, `DATABASE_URL='${{Postgres.DATABASE_URL}}'`, `S3_ENDPOINT`, `S3_REGION=auto`, `S3_BUCKET=<bucketName>`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE=false`. If `railway variable list --service storix-media --json` (or the bucket's variables in `railway environment config --json`) exposes referenceable keys, use references (`'${{storix-media.<KEY>}}'`) instead of copied values.
  - api only: `BETTER_AUTH_SECRET` (`openssl rand -base64 32` piped to `--stdin`), `MEDIA_URL_SECRET` (same), `APP_ORIGIN=https://<railway-domain>`, `PASSKEY_RP_ID=<railway-domain>`.
  - Read back with `railway variable list --service api --json` / `--service worker --json` (values redacted in the report).
- [ ] **Step 7: Bucket CORS.** `railway run --service api -- pnpm --filter @storix/storage set-cors --origins http://localhost:5180,https://storix.tristanhourtoulle.fr,https://<railway-domain>` → logged rules contain the three origins.
- [ ] **Step 8: Deploy.** Trigger a deploy of both services (`railway redeploy --service <svc> --from-source --yes`, or the push already built them); watch `railway logs --service api --build --lines 200` and runtime logs until the pre-deploy migration succeeds and `/api/health` passes; `railway logs --service worker --lines 100` shows pg-boss started and both jobs registered. On build failure, apply superpowers:systematic-debugging (typical suspects: pnpm version from `packageManager`, sharp's linux binary, workspace TS sources not bundled).
- [ ] **Step 9: CDN.** `railway cdn enable --service api --json`; `railway cdn update --service api --purge-on-deploy html --json`; `railway cdn status --service api --json` read back.
- [ ] **Step 10: Bootstrap the owner.** Generate a password (`openssl rand -base64 18`), get the public DB URL from `railway variable list --service Postgres --json` (`DATABASE_PUBLIC_URL`), then `railway run --service api -- env DATABASE_URL="<public url>" BOOTSTRAP_PASSWORD="<password>" pnpm --filter @storix/api bootstrap -- --username tristan --league "Les potes"` → logs user and league ids. (Fallback if the public URL is unavailable: `railway ssh --service api -- 'BOOTSTRAP_PASSWORD=<password> node apps/api/dist/bootstrap.js --username tristan --league "Les potes"'`.) The password goes in the final report to Tristan only.
- [ ] **Step 11: Verify production** (`O=https://<railway-domain>`):
  - `curl -s $O/api/health` → `{"status":"ok","db":"ok"}`; `curl -sI -H 'Accept: text/html' $O/l/x` → `200` HTML, `x-cache` header present.
  - Login works in the browser; the passkey prompt registers a passkey whose RP ID is `<railway-domain>` (DevTools > WebAuthn or the profile list).
  - Client IP: `curl -s ifconfig.me`, hit `$O/api/health`, `railway logs --service api --lines 50 --json` → `remoteAddress` equals your public IP (not a Railway/CDN address). Rate limit (run both loops AFTER Step 9 enabled the CDN, so the real edge-to-origin header chain is tested): 6 sign-in attempts with a rotating fake header (`-H "X-Forwarded-For: 10.0.0.$i"`) and a wrong password → the 6th returns `429`; then, after the window resets, 6 more with a rotating `-H "X-Real-IP: 10.0.0.$i"` and a wrong password → the 6th also returns `429` (a client-supplied `X-Real-IP` must not let anyone pick their rate-limit key).
  - Upload 2 photos from a phone (HEIC on iPhone: Review Focus 2; gyroscope permission: Task 11) → cards appear; DevTools shows the bucket POST to `https://<bucketName>.t3.storageapi.dev` allowed by CSP and CORS.
  - Media through the CDN (Review Focus 3): take one `/media/...` URL from `GET /api/leagues/:id/cards`; `curl -sI $O<url>` twice → second response `x-cache: HIT`, `cache-control: public, max-age=..., immutable`, no `set-cookie`; with the session cookie → still no `set-cookie`; a tampered signature → `403`, `cache-control: no-store`, and repeated requests never `HIT`.
  - `curl -sI $O/api/me` → `cache-control: no-store`, never `x-cache: HIT`; `curl -sI $O/sw.js` → `no-store`.
  - Worker: `railway logs --service worker` shows each job completing; `railway bucket info --bucket storix-media --json` object count grew by 12 for 2 photos and no `incoming/` objects remain after processing.
- [ ] **Step 12: Custom domain.** `railway domain storix.tristanhourtoulle.fr --service api --json` → record the DNS records it returns (CNAME `storix` → `<target>.up.railway.app`, plus any TXT verification record). Write them in the README "Production" section and in the final report as instructions for Tristan to add at Hostinger (DNS zone `tristanhourtoulle.fr`). Do NOT switch `APP_ORIGIN` / `PASSKEY_RP_ID` yet. Document the switch procedure for when `railway domain status storix.tristanhourtoulle.fr --service api --json` reports the domain active: set `APP_ORIGIN=https://storix.tristanhourtoulle.fr` and `PASSKEY_RP_ID=storix.tristanhourtoulle.fr` (one deploy), then passkeys registered on the Railway domain stop working and must be re-added (password login still works).
- [ ] **Step 13: Commit** (after go-ahead) and push: `docs(readme): document railway production setup` — then `git push origin main`.

---

## Self-review notes

- Spec coverage: 4.3 collection (member filter, virtualized grid; rarity filter, owned counter and silhouettes need copies/rarities → Plan 3), 4.4 detail (holo, author, date; reactions/actions/discoverer → Plan 3), 4.5 add photos (multi-select, title ≤ 40, tags, GPS notice; estimated rarity placeholder → Plan 3), 5.1 "provisional at upload" (`is_provisional`, tier `common`), 5.3 upload quota 10/day, 5.6 EXIF read then stripped / GPS never kept / EU bucket, 6.1 + addendum (presigned POST conditions, `incoming/{userId}/{uuid}`, `complete`, worker steps, immutable content-addressed keys, `/media` HMAC route, CDN), 6.2 (SW CacheFirst 500 / 30 days keyed without signature, API SWR on collection reads, `storage.persist()`, srcset AVIF/WebP, thumbhash, lazy, 63:88 ratio, rAF holo, reduced motion, online replay of the upload queue while the screen is open), 6.5 layering + lint, local MinIO, Railway deploy.
- Deferred on purpose (my calls, listed in the report): TanStack Query IndexedDB persister (the SW SWR cache covers offline collection), persistent offline upload queue across app restarts, rarity filter/silhouettes/progress bar, league-configurable quota (Plan 4).
