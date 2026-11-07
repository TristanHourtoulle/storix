CREATE TYPE "public"."tier_source" AS ENUM('computed', 'bounded', 'pinned');--> statement-breakpoint
CREATE TYPE "public"."copy_source" AS ENUM('booster', 'craft');--> statement-breakpoint
CREATE TYPE "public"."copy_variant" AS ENUM('normal', 'foil');--> statement-breakpoint
CREATE TYPE "public"."pull_outcome" AS ENUM('new', 'upgraded', 'duplicate');--> statement-breakpoint
CREATE TYPE "public"."reaction_type" AS ENUM('fire', 'heart', 'star');--> statement-breakpoint
CREATE TABLE "card_copies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"owner_id" text NOT NULL,
	"variant" "copy_variant" NOT NULL,
	"tier_at_mint" "card_tier" NOT NULL,
	"source" "copy_source" NOT NULL,
	"opening_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_copies_card_owner_variant_unique" UNIQUE("card_id","owner_id","variant")
);
--> statement-breakpoint
CREATE TABLE "member_wallets" (
	"league_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"dust" integer DEFAULT 0 NOT NULL,
	"booster_stock" integer NOT NULL,
	"booster_stock_at" timestamp with time zone NOT NULL,
	"pity_since_epic" integer DEFAULT 0 NOT NULL,
	"pity_since_legendary" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_wallets_league_id_user_id_pk" PRIMARY KEY("league_id","user_id"),
	CONSTRAINT "member_wallets_dust_non_negative" CHECK ("member_wallets"."dust" >= 0)
);
--> statement-breakpoint
CREATE TABLE "booster_openings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"request_id" uuid NOT NULL,
	"seed" text NOT NULL,
	"table_version" integer NOT NULL,
	"pity_before" jsonb NOT NULL,
	"pool_digest" text NOT NULL,
	"dust_gained" integer DEFAULT 0 NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "booster_openings_request_unique" UNIQUE("league_id","user_id","request_id")
);
--> statement-breakpoint
CREATE TABLE "booster_pulls" (
	"opening_id" uuid NOT NULL,
	"slot" integer NOT NULL,
	"card_id" uuid,
	"rolled_tier" "card_tier" NOT NULL,
	"tier_at_mint" "card_tier" NOT NULL,
	"variant" "copy_variant" NOT NULL,
	"outcome" "pull_outcome" NOT NULL,
	"dust" integer DEFAULT 0 NOT NULL,
	"is_first_copy" boolean NOT NULL,
	"is_discovery" boolean NOT NULL,
	CONSTRAINT "booster_pulls_opening_id_slot_pk" PRIMARY KEY("opening_id","slot")
);
--> statement-breakpoint
CREATE TABLE "reactions" (
	"card_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"type" "reaction_type" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reactions_card_id_user_id_type_pk" PRIMARY KEY("card_id","user_id","type")
);
--> statement-breakpoint
CREATE TABLE "card_rarity_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"from_tier" "card_tier",
	"to_tier" "card_tier" NOT NULL,
	"source" "tier_source" NOT NULL,
	"score" double precision,
	"percentile" double precision,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "leagues" ADD COLUMN "settings" jsonb;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "computed_tier" "card_tier";--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "tier_source" "tier_source" DEFAULT 'computed' NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "score" double precision;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "percentile" double precision;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "pinned_tier" "card_tier";--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "min_tier" "card_tier";--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "max_tier" "card_tier";--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "rarity_computed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "discovered_by_id" text;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "discovered_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "card_copies" ADD CONSTRAINT "card_copies_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_copies" ADD CONSTRAINT "card_copies_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_copies" ADD CONSTRAINT "card_copies_opening_id_booster_openings_id_fk" FOREIGN KEY ("opening_id") REFERENCES "public"."booster_openings"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_copies" ADD CONSTRAINT "card_copies_member_fk" FOREIGN KEY ("league_id","owner_id") REFERENCES "public"."league_members"("league_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_wallets" ADD CONSTRAINT "member_wallets_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_wallets" ADD CONSTRAINT "member_wallets_member_fk" FOREIGN KEY ("league_id","user_id") REFERENCES "public"."league_members"("league_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booster_openings" ADD CONSTRAINT "booster_openings_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booster_openings" ADD CONSTRAINT "booster_openings_member_fk" FOREIGN KEY ("league_id","user_id") REFERENCES "public"."league_members"("league_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booster_pulls" ADD CONSTRAINT "booster_pulls_opening_id_booster_openings_id_fk" FOREIGN KEY ("opening_id") REFERENCES "public"."booster_openings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booster_pulls" ADD CONSTRAINT "booster_pulls_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reactions" ADD CONSTRAINT "reactions_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_rarity_history" ADD CONSTRAINT "card_rarity_history_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_rarity_history" ADD CONSTRAINT "card_rarity_history_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_copies_league_owner_idx" ON "card_copies" USING btree ("league_id","owner_id");--> statement-breakpoint
CREATE INDEX "booster_openings_league_opened_idx" ON "booster_openings" USING btree ("league_id","opened_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "booster_pulls_card_id_idx" ON "booster_pulls" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "reactions_user_id_idx" ON "reactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "card_rarity_history_card_computed_idx" ON "card_rarity_history" USING btree ("card_id","computed_at" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_discovered_by_id_user_id_fk" FOREIGN KEY ("discovered_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cards_league_status_created_idx" ON "cards" USING btree ("league_id","status","created_at");