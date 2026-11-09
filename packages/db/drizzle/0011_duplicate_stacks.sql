CREATE TABLE "card_copy_stacks" (
	"league_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"owner_id" text NOT NULL,
	"variant" "copy_variant" NOT NULL,
	"tier_at_mint" "card_tier" NOT NULL,
	"count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_copy_stacks_card_id_owner_id_variant_tier_at_mint_pk" PRIMARY KEY("card_id","owner_id","variant","tier_at_mint"),
	CONSTRAINT "card_copy_stacks_count_positive" CHECK ("card_copy_stacks"."count" > 0)
);
--> statement-breakpoint
ALTER TABLE "card_copies" ADD COLUMN "promoted_tier" "card_tier";--> statement-breakpoint
ALTER TABLE "card_copies" ADD COLUMN "promoted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "booster_pulls" ADD COLUMN "stack_count" integer;--> statement-breakpoint
ALTER TABLE "card_copy_stacks" ADD CONSTRAINT "card_copy_stacks_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_copy_stacks" ADD CONSTRAINT "card_copy_stacks_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_copy_stacks" ADD CONSTRAINT "card_copy_stacks_member_fk" FOREIGN KEY ("league_id","owner_id") REFERENCES "public"."league_members"("league_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_copy_stacks_league_owner_idx" ON "card_copy_stacks" USING btree ("league_id","owner_id");--> statement-breakpoint
ALTER TABLE "booster_pulls" ADD CONSTRAINT "booster_pulls_stack_count_positive" CHECK ("booster_pulls"."stack_count" IS NULL OR "booster_pulls"."stack_count" > 0);