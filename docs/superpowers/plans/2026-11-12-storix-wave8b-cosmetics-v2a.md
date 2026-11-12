# Storix wave 8b — Cosmetics v2-a plan

1. shared: slots + 9 items with per-item prices, equipped schema, `nameStyle`/`banner` on member/profile/goal schemas, `stamp` on `cardMomentSchema`; domain tests for prices and families.
2. db: schema columns + migration `0022_wave8b_cosmetics_v2a.sql`.
3. api: repository slot columns, `findMemberLooks`, propagation in members / member-profile / league-goal, `authorMomentStamp` subquery in every Moment selection, `toCardMoment` stamp.
4. web: family model (`shop-families.ts`), `SegmentedControl` + `ShopChips` with animated indicators, family-aware catalogue and Mon style, Sons & partage « Bientôt » state.
5. web: skins (`bn-*`, `fl-*`, `st-*`), `MemberBanner`, `StyledName`, Moment overlay stamps, try-on previews and thumbs.
6. web: release note 2026-11-12-a.
7. gate (typecheck, lint, test, build) + 390 px browser smoke.
