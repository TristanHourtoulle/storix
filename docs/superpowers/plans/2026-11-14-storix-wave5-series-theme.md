# Wave 5 plan: series foundation and weekly theme

Spec: `docs/superpowers/specs/2026-11-14-storix-wave5-series-theme-design.md`.

1. **shared**
   - `domain/series.ts`: kinds, theme rotation list, Paris theme week key and bounds, deterministic
     rotation, series phase, reward eligibility, recap pick. Tests: rotation without repeats, week bounds
     across DST, eligibility.
   - `schemas/series.ts`: shelf, series detail, theme card, theme override body, add-card body.
   - `cardSealSchema` on card summaries (tolerant `.catch([])`), `seriesId` collection filter,
     `seriesIds` on draft edit and draft view.
   - Emblem `series-complete` (metric `seriesCompleted`).
   - Feed type `series_recap` (never grouped, « Photos » filter) and payload fields.
   - Release note.
2. **db**: schema `series.ts`, `uploads.series_ids`, migration 0026 (additive), queries `series.ts`
   (ensure theme, close due series with recap, reward pass, open series check), emblem stat.
3. **worker**: card creation attaches open series from `upload.seriesIds`; series job (Monday rollover at
   00:05 Paris + 10-minute tick).
4. **api**: `features/series` (shelf, detail, theme override, add own card), draft edit `seriesIds`, seals
   column in collection, booster, history and member repositories, `seriesId` collection filter, feed recap
   rows.
5. **web**: `features/series` (api, queries, copy, seal, shelf, tile, theme card, override sheet, add-to-theme
   button), route `l.$leagueId.series.$seriesId`, toggle in the upload stack, `?theme=` on the add route,
   seal on card faces, recap feed row, emblem icon.
6. Gate: typecheck, lint, tests, build.
