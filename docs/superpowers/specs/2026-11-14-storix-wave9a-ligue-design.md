# Storix wave 9a — Ligue page (ranking + trophies)

Source of truth: design artifact https://claude.ai/artifact/RoprodgKkCyHNAochcmVfR, part 1. User picks: layout C, trophy style 1 (medals), the 14 proposed trophies, entry from the home header.

## Entry
- Home header: league avatar + name + "N membres · Classement et trophées" form one tap zone that opens `/l/$leagueId/league`.
- A small switch button on the right keeps the league switcher; it only renders when the user is in more than one league.

## Page (layout C)
- `SegmentedControl` Classement / Trophées (shop component, sliding pill, panel slides with the direction of travel).
- Classement: theme chips (animated indicator, shop chip row), podium of the top 3 (from 3 members), list from rank 4, own row outlined in violet, a sticky "Toi · Ne <thème>" strip at the bottom.
- Trophées: 3-column medal grid, 14 trophies; tapping a medal opens a sheet with the rule and the top 3. Holder avatar on the medal; ties share the medal (both avatars); best value 0 → grey medal "À prendre".
- Tapping any member (podium, row, trophy sheet) opens `/l/$leagueId/members/$userId`.

## Ranking themes
| id | label | value | tie-break |
|---|---|---|---|
| collector (default) | Collectionneur | distinct cards owned; sub "% de la ligue" | total copies (stacks included) |
| hunter | Chasseur | rarity score 1/2/4/10/25/60 per distinct card at its current tier | mythics |
| foil | Brillant | foil copies | best foil tier |
| photographer | Photographe | active cards authored | reactions received |
| opener | Ouvreur | boosters opened | earlier join date |
| fortune | Fortune | paillettes now | alphabetical |
| week | Cette semaine | distinct cards first acquired since the week start (Monday 05:00 Paris) | distinct cards |

Equal values share the rank and show "=". Display order: tie-break, then alphabetical (fr).

## Trophies
Mythomane, Légende, Ouvreur fou, Alchimiste, Recycleur, Crésus, Orfèvre, Explorateur, Photographe, Muse, Main heureuse, Ponctuel, Assidu, Mécène — rules, icons and sources exactly as in the artifact table.

## Rules
- Current members only; former members drop out.
- Podium only from 3 members; below that, list only.
- One aggregated API call per league: `GET /api/leagues/:leagueId/standings`, member guard, all stats per member; ranking and trophies are computed client-side by pure shared domain code. Web `staleTime` 60 s.
- No new tracking, no migration: every stat already exists (card_copies, card_copy_stacks, member_wallets, audit_log, booster_pulls, moment_posts, member_missions, cosmetic_purchases, cards, reactions).

## Release note
`2026-11-14-b`: one card « La page Ligue », try target `league`.
