# Wave 9a plan — Ligue page

1. shared: `schemas/standings.ts` (member stats + response), `domain/standings.ts` (themes, trophies, `rankStandings`, `trophyStanding`) + a few tests; `league` news try target; release note.
2. api: `features/standings/` repository (one aggregate query per stat family, run in parallel), service (members + looks + avatars), route `GET /leagues/:leagueId/standings`; wire in deps/app.
3. web: generic `components/ui/chip-row.tsx` extracted from `ShopChips`; `features/standings/` api, queries, components (page, podium, list, me strip, medals, trophy sheet), `styles/standings.css`; route `l.$leagueId.league.tsx`; home header tap zone + switch button; news link.
4. Gate (typecheck, lint, tests, build) and 390 px Chrome smoke.
