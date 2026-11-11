# Wave 7 — Le Moment (I-20), design B

Design artifact: https://claude.ai/artifact/SUv1AKnRw9zfp4Gz5MMKTL (proposal B, "Le flash plein écran").

## Spec

- Once a day per league, at a surprise time drawn between **07:00 and 21:00 Europe/Paris**
  (seeded by league id + Paris day), the Moment fires. Window: **2 minutes**.
- Every member gets a web push at the fire time (existing VAPID sender). Without push, opening the
  app during the window shows the full-screen flash; after the window a compact fallback banner on
  the home invites a late post until the next Moment fires.
- Capture is sequential (iOS cannot open two cameras): back camera shot, then split screen with the
  frozen back photo on top and the live front camera below, 3-2-1 automatic selfie (manual shutter
  allowed). Preview shows the Moment card; "Refaire" restarts, "Publier" posts.
- One post per member per Moment. Lates are allowed until the next Moment fires, labelled
  "En retard · 1 h 12". Lateness is measured from the fire time to the moment the member confirmed
  the capture (upload reservation), so slow networks do not make a post late.
- **The Moment is a collectible card.** The back photo is a normal card upload going through the
  existing pipeline (media processing, card creation, `card_published` feed event, rarity
  recompute, booster pool). Every existing counter (missions "Poste N photos", weekly league goal
  photos, photo emblems) is card-based and so counts Moments with no change. The only difference
  with a normal photo: it is outside the daily upload quota, and its exact-duplicate check is kept
  but the perceptual near-duplicate check is skipped (fresh capture, similar scenes must not be
  rejected).
- The selfie is a separate `selfie` upload, rendered to small 3:4 WebP files under
  `pic/selfie/<leagueId>/<uploadId>/<size>.webp`, referenced by the card.
- Moment cards render with a cyan frame, the selfie inset top-left, a "MOMENT" badge and, when late,
  an orange "+1 h 12" pill. Collection gets a "Moments" filter (the album).
- No "Moments du jour" view and no blur gating (user correction): Moments are discovered only via
  boosters like every photo.
- Rewards: +30 paillettes on time, +10 late, credited at post time under the wallet lock.
  New daily mission "Poste ton Moment à l'heure" and emblem "Pile à l'heure" (10 on-time Moments).
- Rarity: no special-casing. Cards are created provisional and recomputed by the same jobs.

## Data (migration 0020)

- `upload_kind` += `selfie`; `uploads.is_moment boolean default false`.
- `cards.moment_selfie_upload_id uuid null`, `cards.moment_taken_at timestamptz null`,
  `cards.moment_late_minutes int null` (all or none).
- `moments(league_id, day date, fires_at, notified_at)`, PK (league_id, day): push idempotency.
- `moment_posts(id, league_id, day, user_id, back_upload_id unique, selfie_upload_id unique,
  taken_at, late_minutes, reward_dust, created_at)`, unique (league_id, day, user_id).

## API

- `GET /leagues/:id/moments/current` → the target Moment (latest fired one) with window end and the
  viewer's post if any. Never reveals a Moment that has not fired yet.
- `POST /leagues/:id/moments/uploads` → two presigned uploads (back card upload flagged
  `is_moment`, selfie upload), no quota, refused when already posted for the target Moment.
- `POST /leagues/:id/moments` `{ backUploadId, selfieUploadId, capturedAt }` → validates, inserts the
  post (unique), completes both uploads, credits the reward, enqueues processing.
- `/uploads/:id/complete` refuses `is_moment` uploads; quota counts ignore them.
- Card payloads (`collection`, `detail`, `booster pull`) carry `moment: { selfieUrl,
  selfieSmallUrl, takenAt, lateMinutes } | null`; `listCards` accepts `moment=true`.

## Worker

- `selfie` uploads: probe, render 240/600 px 3:4 WebP, mark ready. Kept alive by GC while an upload
  is rendering or a card references it.
- Card creation copies the Moment fields from `moment_posts` when the upload is a Moment.
- `moments-tick` every minute: for each league whose Moment fired today, insert the `moments` row
  once; when inserted inside the window, push every member device.

## Web

- `moments` feature: API client, `useCurrentMoment` (poll 60 s + focus), flash overlay, fallback
  banner, capture route `/l/$leagueId/moment` (back → split → preview → publish), Moment card
  decoration in `CardFace`, collection "Moments" filter, release note.

## Tasks (commits)

1. shared domain + schemas (+ tests for time picker, lateness, rewards)
2. db schema + migration 0020
3. worker: selfie processing, card moment fields, phash skip, GC, push tick
4. api: moments feature, uploads guards, card payloads, collection filter
5. web: moments feature, capture flow, card decoration, filter, release note
