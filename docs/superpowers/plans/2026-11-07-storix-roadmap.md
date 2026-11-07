# Storix — Roadmap

**Spec:** `docs/superpowers/specs/2026-11-07-storix-design.md`
**Execution:** subagent-driven, one plan at a time. Plans 2-4 are written only after Plan 1 is implemented, so they build on the real code instead of guesses.

## Plan 0 — Bucket spike — DONE (2026-11-07)

Run on the final Railway project `storix`, bucket `storix-media` (region ams, EU). Results (details in the spec addendum):

- Upload: presigned **POST** with `content-length-range` + exact `Content-Type` + `Cache-Control` form field (`eq` condition) — PASS. Presigned PUT rejected (no type enforcement, no CORS header on the response).
- Deterministic presigned GET URLs (24 h `signingDate` window): PASS, but bucket GETs have no `Access-Control-Allow-Origin`, so service worker fetches would be opaque.
- Decision: media served **same-origin by the API** at `GET /media/{windowStart}/{hmac}/{objectKey}` (HMAC-SHA256, 24 h windows, current + previous accepted, `Cache-Control: public, max-age=<remaining window>, immutable`, no `Set-Cookie`) behind the free **Railway CDN** on the api service. This replaces "no image proxy / direct bucket GET".
- Cloudflare R2 rejected (DNS on Hostinger, payment method and interactive login required).

## Plan 1 — Foundation (`2026-11-07-storix-01-foundation.md`)

pnpm monorepo (`apps/web`, `apps/api`, `packages/shared`, `packages/db`), strict TS, ESLint layer boundaries, Prettier, Docker Compose Postgres. Better Auth (username + passkey, DB sessions), invite-only signup, leagues, members and roles, invitations, admin-issued reset codes (home-league-owner rule), audit log, rate limits, origin check. Installable PWA shell in design A with the bottom nav and empty states. Deliverable: a running app covering the full account/league lifecycle.

## Plan 2 — Photos → cards

Upload pipeline (client resize + EXIF date read, presigned upload, `complete` endpoint, per-day quota), `apps/worker` with pg-boss + sharp (magic bytes, metadata strip, 256/768/1600 AVIF + WebP variants, thumbhash, dominant color, perceptual fingerprint, duplicate rejection), hash-based immutable keys, same-origin `GET /media/{windowStart}/{hmac}/{objectKey}` route behind the Railway CDN (per Plan 0), service worker image cache keyed by object key (CacheFirst, 500 entries, 30 days), local MinIO in Docker Compose, first deployment to the Railway project `storix` (api service serving the SPA, worker service, PostgreSQL, Bucket, custom domain `storix.tristanhourtoulle.fr`), collection screen (virtualized grid, filters, silhouettes) and card detail (holo tilt).

## Plan 3 — Game (`2026-11-07-storix-03-game.md`) — DONE (2026-11-07)

Pure domain + unit tests first: rarity engine (signals, percentile, quotas, hysteresis, cold start, precedence), booster stock, pull with injectable RNG, pity, foil, dust economy. Then: booster opening (single transaction, recorded seed, idempotency), copies with `tier_at_mint`, duplicate conversion, recycle / craft / foil, nightly + on-settings recompute with history, reveal animation (booster pack logo text "STORIX", rarity glow, one-by-one / reveal all), reactions, "discovered by", league home (booster card, pity bar, recent reveals, feed).

Shipped as planned, with these changes:

- Default new-card delay before a card enters boosters: **1 h** (user decision; `newCardDelayMinutes` in `leagues.settings`).
- Drop table `DROP_TABLE_VERSION = 2`: under the Epic guarantee the empty-tier fallback searches upward (Legendary, Mythic) before going below Epic; version 1 replays keep the old fallback.
- An empty pool refuses the booster without consuming it, and the home screen shows the pool-empty state with the next eligibility time.
- Honest pity text: "Épique garantie dès qu'une carte Épique existera" when the league has no Epic card, Legendary bonus shown as a chance.
- API service worker cache renamed `storix-api-v2` (v1 purged), media cache also purged on a session change.
- Also on the branch ahead of Plan 4: the shared moderation/compensation domain, tombstone tables (migration 0005), and the `storage.delete` and weekly `storage.gc` worker jobs (Sundays 04:00 Paris, mass-delete breaker, no boot-time run).

Deferred: the home activity feed ("a ajouté 4 photos", "a tiré une Légendaire"), the estimated rarity on the Add photos screen, the league settings UI, admin pins/bounds/Mythic cap UI and the recompute-on-settings-change trigger (Plan 4), booster replay tooling, and trades / Wonder Pick / wishlist / duels / sets (out of MVP).

## Plan 4 — Admin & privacy

League settings (rarity weights, booster cadence, upload quota, Zod-validated JSON), card admin (hide, delete, pin rarity, min/max bounds, validate date, Mythic event capped at 3), tagged-member withdrawal, card disappearance with dust compensation and real bucket deletion, withdrawn-cards sync + service worker / IndexedDB purge, member removal side effects, account deletion ("former member" credit), ownership transfer if needed.
