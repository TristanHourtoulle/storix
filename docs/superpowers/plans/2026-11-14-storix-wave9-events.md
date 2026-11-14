# Storix wave 9 — scheduled events: implementation plan

Spec: `2026-11-14-storix-wave9-events-design.md` (same folder; copy both into `docs/superpowers/{specs,plans}/`).
Base: `origin/main` 43d771e (wave 5 merged, migration 0026). No emoji: events use series icon keys and line icons.
Worktree `../storix-wave9`, branch `feat/wave9-events`. Few tests, domain only. No CI.

Conventions: English code, no `any`, no `console.log`, files < 400 lines, Zod at boundaries, no `.transform`
in response schemas, league-scoped parameterized SQL, immutability. Commit per task (`type(scope): …`).

## T1 — shared domain: event rules (`packages/shared`)

Files:

- `src/domain/series-events.ts` (new)
- `src/domain/series-events.test.ts` (new)
- `src/domain/index.ts` (export)

Content:

- Constants:
  - `EVENT_ICONS` (12 series icon keys; party, dinner, mountain, tree, glass added to `SERIES_ICONS` and `icon.tsx`);
  - `EVENT_MIN_MINUTES = 30`, `EVENT_MAX_HOURS = 48`, `EVENT_MAX_LEAD_DAYS = 30`;
  - `EVENT_START_SLACK_MINUTES = 5`, `EVENT_GRACE_HOURS = 12`, `EVENT_MAX_ACTIVE = 3`.
- `validateEventWindow({ startsAt, endsAt, now }): 'ok' | 'too_short' | 'too_long' | 'in_past' | 'too_far'`.
- `eventGraceEndsAt(endsAt): Date`.
- `captureInstant({ mediaCapturedAt, clientCapturedAt, uploadedAt }): Date`.
- `acceptsPhoto(series: SeriesWindow & { kind }, { capturedAt, sentAt }): boolean`.
  - Theme: `acceptsCards(series, sentAt)`.
  - Event: `acceptsCards(series, sentAt)` plus `startsAt <= capturedAt < endsAt`.
- `prechecked(openSeries, capturedAt): string[]`: ids of events whose window contains `capturedAt`.
- `eventShortcuts(now): { tonight, tomorrowNoon, weekend }`, each `{ startsAt, endsAt }`.
  - Use `parisDayKey` + `parisLocalInstant(key, minutes)` from `missions.ts`.
  - Rules are in the spec (Ce soir / Demain midi / Ce week-end).
- `parisInstantFromLocal('YYYY-MM-DDTHH:mm'): Date` and `toParisLocalInput(date): string` for `<input type="datetime-local">`.

Tests (one file):

- the window validation boundaries: 29 min, 30 min, 48 h, 48 h 1 min, −6 min, +30 days;
- `acceptsPhoto`:
  - a theme ignores capture time;
  - an event rejects capture 11:40 for a 12:00 start;
  - an event accepts 15:50 sent at 21:00 within grace;
  - an event rejects a send after grace;
- `prechecked` with two overlapping events;
- the shortcuts across a DST weekend (2026-10-24/25) and on a Sunday evening.

## T2 — shared schemas (`packages/shared`)

Files:

- `src/schemas/series.ts`:
  - `eventBodySchema` `{ title, icon (enum EVENT_ICONS), startsAt, endsAt }`, with ISO strings → `z.iso.datetime()`;
  - `eventPatchSchema` (partial, at least one key);
  - `eventParamsSchema`;
  - `eventListSchema` `{ live, grace, upcoming: EventSummary[] }`;
  - `EventSummary` = `SeriesSummary` + `createdBy: { userId, displayUsername } | null`, `canManage`, `memberCount`.
- `src/schemas/league-feed.ts`: `FeedSeries` gains `kind`, `startsAt`, `endsAt` (use `.catch` defaults for old rows).
- `src/schemas/moments.ts` (or wherever `postMomentBodySchema` lives): optional `seriesIds: z.array(z.uuid()).max(5)`.
- `src/schemas/errors.ts`: `EVENT_LIMIT_REACHED`, `EVENT_WINDOW_INVALID`, `EVENT_ALREADY_STARTED`, `EVENT_NOT_LIVE`.
- `src/schemas/jobs.ts`: `SERIES_EVENT_PUSH_JOB`.
- `src/schemas/push.ts` (if a separate file): reuse `boosterFullPushPayloadSchema` (the Moment push already does).
- `src/release-notes/catalog.ts`: one card « Les événements », with the next free id at merge.

## T3 — db (`packages/db`)

Files:

- `src/schema/series.ts`:
  - add the `startNotifiedAt` and `endNotifiedAt` columns;
  - add the partial index `card_series_event_start_push_idx` `(starts_at) WHERE kind='event' AND start_notified_at IS NULL`;
  - add the partial index `card_series_event_open_idx` `(league_id, ends_at) WHERE kind='event' AND closed_at IS NULL`.
- `drizzle/0027_wave9_events.sql` + `meta/0027_snapshot.json` + `_journal.json`, generated with drizzle-kit and chained after 0026. Additive only.
- `src/locks/league-locks.ts`: `lockLeagueSeries(db, leagueId)`. It is a `pg_advisory_xact_lock` keyed like the other league locks.
- `src/queries/series.ts`, reusing the existing helpers:
  - `countActiveEvents(db, { leagueId, now })`: upcoming + live, where `closed_at IS NULL AND ends_at > now`;
  - `insertEvent`, `updateUpcomingEvent` (guarded by `starts_at > now`), `deleteUpcomingEvent` (same guard);
  - `endEventNow` (guarded by `starts_at <= now < ends_at`; sets `ends_at = now`, `grace_ends_at = now + 12h`);
  - `listLeagueEvents(db, { leagueId, now })`: not closed;
  - `claimEventStartPush(db, now)`: `UPDATE … SET start_notified_at = now WHERE kind='event' AND start_notified_at IS NULL AND starts_at <= now RETURNING *`. Then the caller skips rows with `ends_at <= now`, which are marked but not pushed.
  - `claimEventEndPush(db, { seriesId, now })` plus `listSeriesContributorIds`;
  - **extend `filterOpenSeries`** with an optional `capture: { capturedAt: Date; sentAt: Date }`. When given, use `acceptsPhoto` per row. Without it, behaviour is unchanged for wave 5 callers.
- `src/index.ts`: exports.

## T4 — worker (`apps/worker`)

Files:

- `src/features/media/media.repository.ts`:
  - make sure `publishRequestedAt` and the media `capturedAt` are read in `uploadColumns` / `UploadForProcessing`;
  - add them if they are missing.
- `src/features/media/card-creation.ts`: call `filterOpenSeries` with `capture: { capturedAt: captureInstant(...), sentAt: upload.publishRequestedAt ?? now }`.
- `src/features/series/series-push.service.ts` (new):
  - `notifyStarts()` runs every minute. It claims the starts, then sends the start push to `listLeaguePushTargets` (reuse it from `features/moments/moments.repository.ts`; move it to a shared push repository if the import gets awkward). It deletes `gone` / `refused` subscriptions, like the Moment tick.
  - `notifyEnd(series)` sends to the contributors' devices only.
  - It needs a "push targets for user ids" query in the same repository.
- `src/features/series/series.service.ts`:
  - after `closeSeries` returns true for an event with cards, call `pushes.notifyEnd`;
  - guard with `claimEventEndPush` so restarts don't double-send;
  - the sender may be null (no VAPID), in which case skip.
- `src/jobs/series.job.ts`: register `SERIES_EVENT_PUSH_JOB` with cron `* * * * *`, tz Europe/Paris, batchSize 1.
- `src/main.ts`: wire the push service with `sender` (create the series service after `sender` exists, or pass `sender` in).

## T5 — api (`apps/api`)

Files:

- `src/features/series/series-events.service.ts` (new, keeps `series.service.ts` under 400 lines):
  - `list(m)`;
  - `create(m, body)`, in a transaction: `lockLeagueSeries`, then count, then validate, then insert;
  - `update(m, id, patch)`, `cancel(m, id)`, `end(m, id)`;
  - authorization: creator or `hasRoleAtLeast(role, 'admin')`, otherwise `forbidden`.
- `src/features/series/series-events.routes.ts` (new): the 5 endpoints of the spec, with `authenticate`, `requireLeagueRole('member')` and `rateLimits.seriesRead/Write`.
- `src/features/series/series.service.ts`, `addCard`: for `kind === 'event'`, load the card's upload capture (join `uploads.card_id`, media `captured_at`, `client_captured_at`) and use `acceptsPhoto`.
- `src/features/series/series.repository.ts`: add `findCardCapture`.
- `src/features/uploads/upload-drafts.service.ts`: pass `capture` to `filterOpenSeries`. Use the draft's capture instant; `sentAt` is now.
- `src/features/moments/moments.service.ts`: on `post`, filter `body.seriesIds` with `capture: { capturedAt: takenAt, sentAt: now }` and write `uploads.series_ids` on the back upload in the same transaction. `moments.repository.ts` gets a small update helper.
- `src/features/series/series-feed.repository.ts`: `FeedSeriesRef` carries `kind`, `startsAt`, `endsAt`.
- `src/app.ts`, `src/deps.ts`: register the events service and routes.

## T6 — web: data layer (`apps/web`)

Files:

- `src/features/series/series.api.ts`: `listEvents`, `createEvent`, `updateEvent`, `cancelEvent`, `endEvent`.
- `src/features/series/series.queries.ts`: `eventsQueryOptions(leagueId)` with staleTime 30 s.
- `src/features/series/use-event-mutations.ts` (new): mutations that invalidate events, shelf, theme card and standings.
- `src/features/series/series-copy.ts`: French strings, Paris time formatting via `Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris' })`.

## T7 — web: create / edit sheet (3 steps)

Files:

- `src/features/series/components/event-sheet.tsx` (new). Match the artifact `mountCreate`:
  - step dots, « Étape n / 3 », « ✕ Fermer » / « ‹ Retour », « Suivant » / « Créer l'événement »;
  - step 1: name (max 40) plus a 12-icon picker (same radiogroup as the theme sheet);
  - step 2: shortcut chips « Ce soir », « Demain midi », « Ce week-end », then Début / Fin with `datetime-local` (Paris conversion helpers from T1), hint « Heure de Paris · de 30 min à 48 h. », inline validation from `validateEventWindow`;
  - step 3: summary card plus hint;
  - edit mode reuses it, prefilled, with the title « Modifier l'événement ».
- `src/styles/series-events.css` (new): `.steps`, `.event-icons`, `.quick`, `.sum`, `.live-banner`. Copy the values from the artifact CSS (lines 216-234 and the related rules).
- Reuse the app's bottom sheet / modal layer (`use-modal-layer`) the way `next-theme-sheet.tsx` does.

## T8 — web: live banner and home

Files:

- `src/features/series/components/live-banner.tsx` (new). Exact artifact markup and copy:
  - « En direct », title, « jusqu'à HH:MM · N photos · M membres », « Prendre une photo » (camera icon) → `/l/$leagueId/add?series=<id>`;
  - « +1 événement » when there are several;
  - grace variant « Terminé · photos jusqu'à HH:MM » with « Ajouter une photo ».
- `src/routes/_authed/l.$leagueId.index.tsx`: if `events.live` is non-empty, render `LiveBanner` in place of `ThemeCard`. In grace, render the compact variant above `ThemeCard`.

## T9 — web: publish toggles (prechecked events)

Files:

- `src/routes/_authed/l.$leagueId.add.tsx`:
  - search becomes `{ resume?, theme?, series? }`; keep `theme` for old links;
  - `openSeries` = the open theme plus the live and grace events from `eventsQueryOptions`;
  - `defaultSeriesIds` = theme (from the theme card) or the `series` param.
- `src/features/uploads/session/session-reducer.ts`:
  - `StackCard.seriesTouched: boolean`, set by any manual toggle;
  - a new action `capture-known` (or extend the existing prepared/staged action) that, when `!seriesTouched`, unions `prechecked(openEvents, capturedAt)` into `seriesIds` once.
- `src/features/uploads/session/use-upload-session.ts`: pass the open events in; dispatch the precheck when `capturedAt` resolves (picked file EXIF or the server draft).
- `src/features/uploads/stack/stack-fields.tsx`, `SeriesToggles`:
  - show an event only if `acceptsPhoto(event, { capturedAt: card.capturedAt ?? now, sentAt: now })`;
  - the subtitle « Prise pendant l'événement » when it qualifies, as in the artifact.
- `src/features/uploads/stack/card-stack.tsx`: the toggle marks `seriesTouched`.
- Draft resume: `seriesIds` already persists through autosave (wave 5). `seriesTouched` is local, so a resumed draft isn't re-prechecked.

## T10 — web: Moment publish toggles

Files:

- The Moment preview component (`moment-preview.tsx`, from wave 8):
  - add the same `SeriesToggles` (extract it to `features/series/components/series-toggles.tsx` and import it in both places);
  - live events are prechecked, the theme is off;
  - send `seriesIds` in the post body.

## T11 — web: management surfaces

Files:

- `src/features/standings/` Ligue page: add an « Événements » block above the segmented control:
  - live and upcoming rows, with « Programmer un événement »;
  - « Modifier » / « Annuler » / « Terminer » per `canManage`;
  - cancel and end-early use a confirm sheet, never `window.confirm`.
- `src/routes/_authed/l.$leagueId.series.$seriesId.tsx`:
  - event header « Événement · sam. 20h–2h »;
  - « Programmer un événement » button;
  - manage actions for the creator or admin.
- `src/features/series/components/series-recap-row.tsx`: the event wording from the spec, driven by `kind` / `startsAt` / `endsAt`.

## T12 — gate and smoke

- `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.
- Portly re-pointed to `../storix-wave9`, migration applied locally. Chrome DevTools at 390px, tristan + max:
  - create via the 3 steps and each shortcut; validation errors; the 4th active event is refused;
  - edit and cancel before the start; end early while live;
  - live banner, « +1 », grace variant;
  - force the start push by setting `starts_at` in the past locally, then check the log line and `start_notified_at`;
  - publish a photo captured inside the window: prechecked; captured outside: no toggle; manual off survives autosave;
  - Moment with a live event: prechecked;
  - close the event by moving `grace_ends_at` into the past: recap row with the event wording, plus the end push only for contributors;
  - an event with 0 photos: nothing shown;
  - no horizontal overflow. Close the Chrome pages.

## Reuse map (wave 5 → wave 9)

| Need                    | Reused from wave 5                                                               |
| ----------------------- | -------------------------------------------------------------------------------- |
| Storage                 | `card_series` (`kind='event'`), `card_series_cards`, `uploads.series_ids`        |
| Phases / open check     | `seriesPhase`, `acceptsCards` (`domain/series.ts`)                               |
| Attach at card creation | `filterOpenSeries` + `attachCardToSeries` (extended with capture)                |
| Close + recap + reward  | `listDueSeries`, `closeSeries`, `listUnrewardedCompletions`, `rewardCompletion`  |
| Collection UI           | `SeriesShelf`, `series-tile`, series page, seals, recap row                      |
| Publish UI              | `SeriesToggles`, session `seriesIds`, draft autosave                             |
| Push                    | `listLeaguePushTargets`, push sender, claim-then-send pattern of the Moment tick |
