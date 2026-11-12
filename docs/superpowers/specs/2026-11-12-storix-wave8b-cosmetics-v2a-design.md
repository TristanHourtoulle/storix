# Storix wave 8b — Cosmetics v2-a design

Date: 2026-11-12. Source artifacts: cosmetics v2 (https://claude.ai/artifact/CrDFztFbByKGFGqvedLwV3, user accepted all reco designs) and the shop selector (https://claude.ai/artifact/8FWh3KCi4wdMxkdf7iceDR, proposal B picked, transitions must be animated).

## Scope
1. Shop and Mon style are grouped into three families with a full-width segmented control (Freelance Manager `SegmentedControl` port) and counted sub-category chips:
   - Cartes: Boosters, Dos, Raretés, Aura, Tampon
   - Profil: Cadre, Bannière, Pseudo
   - Sons & partage: empty « Bientôt » state (sound packs and share styles ship in v2-b / later)
   Transitions: sliding active pill (transform, 250 ms ease-out), sliding chip indicator, list slides in the direction of travel; all disabled under `prefers-reduced-motion`.
2. Three new league-visible slots, full stack:
   - `banner` (bannière de classeur): Constellation 400, Pellicule 500, Aurore 400. Member page header, behind the name and avatar. Pellicule scrolls the member's showcase photos.
   - `nameStyle` (reflet du pseudo): Or 900, Holo 900, Surligneur 600. Display name in the feed, member list/directory, member page, goal ranking, own profile.
   - `momentStamp` (tampon du Moment): Ticket, Polaroid, Encre, 400 each. Badge + selfie frame on the author's Moment cards, everywhere a Moment card face renders.

## Data
- Prices move from per-slot to per-item (catalogue keeps a slot default).
- `user_cosmetics` gains nullable `banner`, `name_style`, `moment_stamp` columns (migration 0022, additive).
- API: `findMemberLooks` replaces `findAvatarFrames` and returns frame + name style + banner; members, member profile and league goal expose `nameStyle` (and `banner` on the profile header). Moment payloads carry the author's equipped `stamp`, selected by a correlated subquery next to the selfie id.
- Responses stay tolerant: unknown ids decode to null, missing fields to null.

## Out of scope
Déchirure, sound packs, Cosmos/Vitrail themes (v2-b); share style, dust pill (later).
