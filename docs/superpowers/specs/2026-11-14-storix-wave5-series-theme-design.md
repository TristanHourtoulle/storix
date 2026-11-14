# Storix wave 5: series foundation and weekly theme

Date: 2026-11-14. Source designs: themes-evenements artifact (https://claude.ai/artifact/8jM92UgbWfH1i5qM3FASyY).
Picks: shared foundation = every recommendation; theme = rotation B (admin can replace next week), home card A,
publish toggle, no per-member cap, Monday recap in the feed. The user insisted a photo can go to the theme OR
only to the default collection, so the toggle is easy to switch off. The weekly poll (I-29) was not chosen and
is out of scope. Wave 9 (scheduled events) reuses this foundation.

## The series

A series is a small collection inside the league collection. Two kinds share one model:

- `theme`: the weekly theme, one per league per Paris week (Monday 00:00 to next Monday 00:00, Europe/Paris,
  as the artifact states; stored in UTC). No grace window: cards can join until Sunday 23:59.
- `event`: wave 9 (scheduled, `grace_ends_at` = end + 12 h). Only the model and the read side exist now.

Series cards stay normal cards: they live in the general collection and are drawn by classic boosters with
the same odds. The draw does not change.

A card can belong to several series. A withdrawn (hidden) card leaves every series total. Each week is a new
series even when a theme comes back.

### Data

- `card_series`: id, league_id, kind (`theme` | `event`), title, emoji, color, week_key (themes only, unique
  per league), starts_at, ends_at, grace_ends_at, closed_at, created_by, created_at.
- `card_series_cards`: (series_id, card_id) primary key, added_at. Cascades with the series and the card.
- `card_series_rewards`: (series_id, user_id) primary key, league_id, rewarded_at. One reward per member and
  series.
- `uploads.series_ids`: jsonb array of the series chosen on the publish screen, copied onto the card when it
  is created, keeping only series of the same league that still accept cards at that moment.

### Rules

- A series accepts cards while `starts_at <= now < grace_ends_at` and it is not closed.
- Collection: a « Séries » shelf at the top (layout A). A tile shows the emoji, the name and either
  « ● En cours · N cartes » (open) or « owned / total » with a progress bar (closed, « · complète » at 100 %).
  Only series with at least one card are listed, the open theme first, then newest first.
- Series page: header (emoji, name, kind, dates, progress), then the series cards with the regular collection
  grid (owned cards and locked silhouettes « encore à trouver »). Open series say « possédées sur N pour
  l'instant · en cours, le total bouge ».
- Seal 1: a round emoji badge at the top-left of series cards (grid, booster, feed, mini cards). The card
  detail lists the full series names.
- Reward: when a closed series of at least 5 active cards is fully owned by a member, they get the emblem
  « Série complète » (once) and 150 paillettes (each series). Checked by the worker every 10 minutes, so a
  series completed later through boosters still pays. Idempotent through `card_series_rewards`.

## Weekly theme

- Rotation B: a list of 40 themes (title, emoji, color) in shared code. Each league walks a deterministic
  shuffle of the list (seeded by league id and cycle), so no theme repeats before the list is used up.
- An admin (or owner) can replace next week's theme with a title and an emoji (or a suggestion from the
  list). The override is the next week's `card_series` row, created ahead of time; the rotation fills any
  week without a row.
- Home: the theme card (A) between the Moment and the booster: emoji, « Thème de la semaine », name, days
  left (« J-3 », « Dernier jour »), the avatars of the members who posted, « N photos · M membres », and two
  buttons: « ＋ Ajouter » (opens the camera with the theme toggle on) and « Voir la série ».
- Publish: a « Séries » field under the tags with a toggle row « Thème · Vert ». It is on only when the
  session was opened from the theme card; from the regular + button it is off. It is always visible and
  switchable per photo; « Hors thème » when off. The choice is saved with the draft.
- The author can also add one of their own cards published during the theme week to the theme from the card
  detail, until Sunday 23:59.
- No per-member cap. The league upload quota applies normally (no exemption, unlike the Moment).
- Monday 00:05 Paris: the past theme closes and a recap is posted in the league feed (only when it has
  cards): « « Vert » est terminé », the new theme, five cards, the card and member counts, and the most
  active member. Tapping it opens the series page. The rollover also creates the new week's theme.
  Catch-up runs every 10 minutes, and the API creates the current theme on read if the worker has not.

## Out of scope

Weekly poll (I-29). Event creation, live banner, start push and event cosmetics (wave 9). Moment cards
joining a series (wave 9, with events).
