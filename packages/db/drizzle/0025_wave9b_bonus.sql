CREATE TABLE "charm_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"charm" text NOT NULL,
	"price" integer NOT NULL,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "charm_purchases_price_non_negative" CHECK ("charm_purchases"."price" >= 0)
);
--> statement-breakpoint
ALTER TABLE "member_wallets" ADD COLUMN "charm" text;--> statement-breakpoint
ALTER TABLE "member_wallets" ADD COLUMN "charm_charges" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "booster_openings" ADD COLUMN "charm" text;--> statement-breakpoint
ALTER TABLE "booster_pulls" ADD COLUMN "is_charm_boosted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "charm_purchases" ADD CONSTRAINT "charm_purchases_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "charm_purchases" ADD CONSTRAINT "charm_purchases_member_fk" FOREIGN KEY ("league_id","user_id") REFERENCES "public"."league_members"("league_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "charm_purchases_member_idx" ON "charm_purchases" USING btree ("league_id","user_id","purchased_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "member_wallets" ADD CONSTRAINT "member_wallets_charm_charges_non_negative" CHECK ("member_wallets"."charm_charges" >= 0);