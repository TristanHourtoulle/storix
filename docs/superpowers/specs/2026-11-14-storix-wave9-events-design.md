# Storix wave 9: scheduled events (design)

Date: 2026-11-14. Source of truth for the UI: the "Vague 9 · Événements programmés" section of
`scratchpad/wave5-9/themes-evenements.html` (artifact https://claude.ai/artifact/8jM92UgbWfH1i5qM3FASyY).
Built on the wave 5 series foundation (merged in 43d771e, migration 0026).

**No emoji anywhere** (user decision 2026-11-14, "je trouve ça moche"): events use the series icon keys and
the app's line icons, exactly like the weekly theme since wave 5.

## Goal

A member schedules an event ("Repas de famille, dimanche 12h–16h", "Soirée ce soir"). Photos taken
during the event go into that event's series, a sub-collection inside the league collection. Series
cards stay normal cards that are drawn in classic boosters.

## User picks (frozen)

- Any member creates an event in 3 steps: (1) name + icon, (2) start + end, (3) confirm. No recurrence.
- Live display **A**: a live banner on home, plus a push to every league device when the event starts.
- Publish: the event toggle is **pre-checked** when the photo's capture time falls inside the event
  window. There is a **12 h grace** after the end to send photos taken during the event. Opting out stays
  one tap, like the theme toggle.
- The Moment card may join an event (and the theme).
- End: the series closes at the end of the grace window, the feed gets the recap, and the completion
  reward from wave 5 applies unchanged.
- Event cosmetics in the shop: out of scope (later, see cosmetics backlog).

## What wave 5 already gives us (reused as is)

- `card_series` already allows `kind = 'event'` (`card_series_kind_check`), with `starts_at`, `ends_at`,
  `grace_ends_at`, `closed_at`, `created_by_id`, `color`. `week_key` must be NULL for events (check).
- `card_series_cards`, `card_series_rewards`, `uploads.series_ids`.
- Domain `packages/shared/src/domain/series.ts`: `seriesPhase` (upcoming/live/grace/closed), `acceptsCards`,
  `isRewardEligible`, `mostActive`, `seriesColorFor`, `parisLocalInstant`/`parisDayKey` (missions.ts).
- DB queries `packages/db/src/queries/series.ts`: `filterOpenSeries`, `attachCardToSeries`,
  `listDueSeries`, `closeSeries` (recap event `series_recap`, nothing posted when 0 cards),
  `listUnrewardedCompletions`, `rewardCompletion`.
- Worker: `card-creation.ts` attaches cards to `upload.seriesIds` filtered by `filterOpenSeries`;
  `series.service.ts` tick (every 10 min) closes due series and pays completions.
- API `features/series/*`: shelf (already hides `upcoming` and empty series), series page, theme card,
  `POST series/:id/cards` (author adds an own card).
- Web: `SeriesToggles` in `stack-fields.tsx`, `seriesIds` on the upload session and draft autosave,
  `SeriesShelf`, series page route, seals on cards, `series-recap-row.tsx`.

## Rules

### Creation

- Name: 1–40 chars (`SERIES_TITLE_MAX_LENGTH`), trimmed. Icon: one of 12 event icon keys (`EVENT_ICONS`:
  party, dinner, cake, mountain, sun, tree, ball, music, glass, heart, moon, camera), drawn with the line icons
  of `components/ui/icon.tsx`. Five keys are new (party, dinner, mountain, tree, glass) and join `SERIES_ICONS`. Colour: `seriesColorFor(title)` (stable, no picker).
- Window: duration 30 min to 48 h. Start no earlier than now − 5 min (so "now" works) and no later
  than now + 30 days. `grace_ends_at = ends_at + 12 h`. Everything entered and shown in Europe/Paris,
  stored in UTC.
- Shortcuts (step 2), computed in Paris time by a pure domain function:
  - « Ce soir »: today 20:00 → tomorrow 02:00; after 19:55 it starts now (rounded up to 5 min).
  - « Demain midi »: tomorrow 12:00 → 16:00.
  - « Ce week-end »: next Saturday 10:00 → Sunday 20:00. On Saturday it is today 10:00 or now;
    on Sunday it is now → Sunday 20:00 if at least 30 min remain, otherwise the next weekend.
- At most **3 upcoming-or-live events per league** (grace and closed do not count). Checked under a
  per-league advisory lock to stay race-safe.
- Step 3 summary text matches the artifact: "Notification à tous au début · 12 h pour ajouter des
  photos après la fin", hint "Tu pourras le modifier ou l'annuler avant le début."

### Editing, cancelling, ending early

- Who: the creator, or an admin/owner.
- Before the start (phase `upcoming`): edit name, icon, start, end (same validation), or **cancel**
  (row deleted; drafts that referenced it simply drop the id through `filterOpenSeries`).
- After the start (phase `live`): only **end early**. `ends_at = now`, `grace_ends_at = now + 12 h`. Cards
  already attached stay. Not allowed in `grace` or `closed`.
- A creator who leaves the league: the event stays (`created_by_id` keeps the user id, `set null` only
  on account deletion); admins can still manage it.

### Which photos go in

- **Capture instant** of a photo = media EXIF `capturedAt` ?? `uploads.client_captured_at` ?? the upload
  time. This is the same order as the draft's `capturedAt` (`toDraft` in `upload-drafts.service.ts`).
- An event **accepts a photo** when the photo is sent before `grace_ends_at` and its capture instant is
  in `[starts_at, ends_at)`. The theme keeps its wave 5 rule (no capture condition).
- "Sent" is `uploads.publish_requested_at` (fallback: now). The worker may build the card a little
  later; a publish at 03:59 for a 04:00 grace end must still count.
- Publish screen (artifact "Pré-coché + 12 h de grâce"):
  - the toggle list shows the open theme plus every event that accepts this photo;
  - an event toggle is **pre-checked once**, when the card's capture time becomes known and falls in
    the window; any manual tap wins afterwards;
  - an event the photo does not qualify for is not shown at all;
  - the theme toggle stays as in wave 5 (on only when coming from the theme card).
- Server enforcement: the draft edit and the worker re-check acceptance with the capture instant, so a
  client cannot push an out-of-window photo into an event.
- `POST series/:id/cards` (add an own existing card): for events the capture instant of the card's
  upload must be in the window and the call must happen before `grace_ends_at`.
- Overlapping events: allowed; one toggle each; one photo can be in several series.
- Moment: the Moment publish screen shows the same toggles. Live events are pre-checked (the capture is
  now), the theme is off by default. Moments stay exempt from the quota.

### Live display (A)

- While an event is `live`, a **live banner** replaces the theme card at the top of home (artifact
  `live-banner`): the event icon, red « En direct » dot, title, "jusqu'à HH:MM · N photos · M membres", and a big
  « Prendre une photo » (camera line icon) button that opens `/add?series=<eventId>`.
- Several live events: one banner for the one ending first, with a small « +1 événement » link to the
  shelf.
- `grace` phase (decided here, small addition): a compact banner variant "Terminé · photos jusqu'à 04:00"
  with « Ajouter une photo », so the 12 h grace is discoverable. Hidden once closed.
- Start push, sent once per event by a worker cron every minute, to every subscribed device of the league
  (same targets as the Moment push): « La Soirée de Léa commence ! Les photos d'ici 2:00 vont dans sa
  série. » → `/l/<leagueId>`, tag `event:<id>`. Not sent if the event already ended (worker down).
- End push, once, at close, only to members who added at least one card: « La Soirée de Léa est finie :
  23 cartes à trouver dans les boosters. » → the series page. Nothing for an event with 0 cards.

### Where events are managed

- « Programmer un événement » button: on the series page and on the Ligue page (artifact "L'entrée").
- Ligue page: a small « Événements » block above the Classement/Trophées control, listing live and upcoming
  events (icon, title, Paris time range). Creator/admin get « Modifier » / « Annuler » (upcoming) or
  « Terminer » (live). Hidden when there is none.
- Event series page: header "Événement · sam. 20h–2h", the creator's manage actions.

### End and recap

- Reuses `closeSeries`: at `grace_ends_at` the tick closes it and posts `series_recap`. The recap row for an
  event reads « La Soirée de Léa est finie », « Événement · sam. 20h–2h », « N cartes », « M membres »,
  « à trouver dans les boosters » (artifact `recap9`). The feed series ref needs `kind`, `startsAt`, `endsAt`.
- 0 cards: no recap, no tile, no reward, no end push (already the wave 5 behaviour for the first three).
- Completion reward: unchanged (closed + 5 cards or more).

### Edge cases (artifact table)

| Case                   | Rule                                                                     |
| ---------------------- | ------------------------------------------------------------------------ |
| Two events at once     | Allowed, one toggle each, max 3 upcoming-or-live per league              |
| Member not there       | Sees the banner, can browse, turns the toggle off; no end push           |
| Time zone              | Entered and shown in Paris time, stored UTC; DST via `parisLocalInstant` |
| Moment during an event | Can join the event and the theme, still quota-exempt                     |
| Event with 0 photos    | No recap, no tile, no reward                                             |
| Cancel                 | Before start only; after start only « Terminer »                         |
| Card withdrawn         | Leaves the series counts (already: counts use `cards.status = 'active'`) |

## Data (migration 0027, additive)

- `card_series.start_notified_at timestamptz NULL`, `card_series.end_notified_at timestamptz NULL`.
- Partial index for the push cron: `(starts_at) WHERE kind = 'event' AND start_notified_at IS NULL`.
- Partial index for the event list: `(league_id, ends_at) WHERE kind = 'event' AND closed_at IS NULL`.
- No new table. Event rows are `card_series` with `kind = 'event'`, `week_key = NULL`.

## API

| Method | Path                                             | Who           | Notes                                                         |
| ------ | ------------------------------------------------ | ------------- | ------------------------------------------------------------- |
| GET    | `/leagues/:leagueId/series/events`               | member        | `{ live, grace, upcoming }` with `canManage`, counts          |
| POST   | `/leagues/:leagueId/series/events`               | member        | create; 409 `EVENT_LIMIT_REACHED`, 400 `EVENT_WINDOW_INVALID` |
| PATCH  | `/leagues/:leagueId/series/events/:seriesId`     | creator/admin | upcoming only; 409 `EVENT_ALREADY_STARTED`                    |
| DELETE | `/leagues/:leagueId/series/events/:seriesId`     | creator/admin | upcoming only; 204                                            |
| POST   | `/leagues/:leagueId/series/events/:seriesId/end` | creator/admin | live only; 409 `EVENT_NOT_LIVE`                               |

Moment publish body gains optional `seriesIds` (validated like drafts). Response schemas: Zod, no
`.transform` (codecs / `.catch` only). Rate limits: reuse `seriesRead` / `seriesWrite`.

## Out of scope

Event cosmetics, recurrence, RSVP/attendance, editing after the start, a feed row for "X a programmé Y".

## Release note

One card « Les événements » (programme une soirée, ses photos forment une série), id = next free id at
merge time.
