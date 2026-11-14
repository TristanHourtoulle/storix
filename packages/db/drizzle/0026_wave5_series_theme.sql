CREATE TABLE "card_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"emoji" text NOT NULL,
	"color" text NOT NULL,
	"week_key" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"grace_ends_at" timestamp with time zone NOT NULL,
	"closed_at" timestamp with time zone,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_series_kind_check" CHECK ("card_series"."kind" IN ('theme', 'event')),
	CONSTRAINT "card_series_theme_week_check" CHECK (("card_series"."kind" = 'theme') = ("card_series"."week_key" IS NOT NULL)),
	CONSTRAINT "card_series_window_check" CHECK ("card_series"."ends_at" > "card_series"."starts_at" AND "card_series"."grace_ends_at" >= "card_series"."ends_at")
);
--> statement-breakpoint
CREATE TABLE "card_series_cards" (
	"series_id" uuid NOT NULL,
	"card_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_series_cards_series_id_card_id_pk" PRIMARY KEY("series_id","card_id")
);
--> statement-breakpoint
CREATE TABLE "card_series_rewards" (
	"series_id" uuid NOT NULL,
	"league_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"rewarded_at" timestamp with time zone NOT NULL,
	CONSTRAINT "card_series_rewards_series_id_user_id_pk" PRIMARY KEY("series_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "series_ids" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "card_series" ADD CONSTRAINT "card_series_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_series" ADD CONSTRAINT "card_series_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_series_cards" ADD CONSTRAINT "card_series_cards_series_id_card_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."card_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_series_cards" ADD CONSTRAINT "card_series_cards_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_series_rewards" ADD CONSTRAINT "card_series_rewards_series_id_card_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."card_series"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_series_rewards" ADD CONSTRAINT "card_series_rewards_member_fk" FOREIGN KEY ("league_id","user_id") REFERENCES "public"."league_members"("league_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "card_series_theme_week_unique" ON "card_series" USING btree ("league_id","week_key") WHERE "card_series"."kind" = 'theme';--> statement-breakpoint
CREATE INDEX "card_series_league_starts_idx" ON "card_series" USING btree ("league_id","starts_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "card_series_open_grace_idx" ON "card_series" USING btree ("grace_ends_at") WHERE "card_series"."closed_at" IS NULL;--> statement-breakpoint
CREATE INDEX "card_series_cards_card_idx" ON "card_series_cards" USING btree ("card_id");--> statement-breakpoint
CREATE INDEX "card_series_rewards_member_idx" ON "card_series_rewards" USING btree ("league_id","user_id");