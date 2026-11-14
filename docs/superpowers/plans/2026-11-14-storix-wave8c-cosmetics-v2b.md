# Plan: wave 8c cosmetics v2-b

1. shared: catalog (slot `openingTear`, 8 items), schemas (`openingTear`), domain tests.
2. db: `opening_tear` column, migration 0023 via drizzle-kit generate.
3. api: cosmetics repository reads/writes the new column (default look, select, mapping).
4. web skins: `tearKind`, pack/back/rarity classes for Cosmos and Vitrail, palette `vitrail`,
   share canvas frame, theme accents, copy (slot titles, hints, prefixes), style context default.
5. web opening: tear overlay + top piece in `ArcadePack`, `tear-choreography.ts`, wiring in
   `use-arcade-opening` (tear kind + accent of the best pull).
6. web shop: « Déchirure » category, `TearDemo` cabin stage and thumbnails.
7. Release note `2026-11-14`.
8. Gate (typecheck, lint, tests, build) and 390 px Chrome smoke.
