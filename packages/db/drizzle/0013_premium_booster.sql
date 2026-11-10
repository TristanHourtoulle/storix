ALTER TABLE "member_wallets" ADD COLUMN "boosters_opened" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "booster_openings" ADD COLUMN "is_premium" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "member_wallets" ADD CONSTRAINT "member_wallets_boosters_opened_non_negative" CHECK ("member_wallets"."boosters_opened" >= 0);--> statement-breakpoint
UPDATE "member_wallets" w SET "boosters_opened" = c.n
FROM (SELECT "league_id", "user_id", count(*)::int AS n FROM "booster_openings" GROUP BY "league_id", "user_id") c
WHERE w."league_id" = c."league_id" AND w."user_id" = c."user_id";
