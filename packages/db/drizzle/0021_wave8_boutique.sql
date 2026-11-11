CREATE TABLE "cosmetic_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"item_id" text NOT NULL,
	"league_id" uuid,
	"price" integer NOT NULL,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cosmetic_purchases_user_item_unique" UNIQUE("user_id","item_id"),
	CONSTRAINT "cosmetic_purchases_price_non_negative" CHECK ("cosmetic_purchases"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "user_cosmetics" (
	"user_id" text PRIMARY KEY NOT NULL,
	"booster" text,
	"card_back" text,
	"rarity_set" text,
	"avatar_frame" text,
	"reveal_aura" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cosmetic_purchases" ADD CONSTRAINT "cosmetic_purchases_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cosmetic_purchases" ADD CONSTRAINT "cosmetic_purchases_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_cosmetics" ADD CONSTRAINT "user_cosmetics_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;