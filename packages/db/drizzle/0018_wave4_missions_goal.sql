CREATE TABLE "member_missions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"period" text NOT NULL,
	"period_key" text NOT NULL,
	"slot" smallint NOT NULL,
	"mission_id" text NOT NULL,
	"target" integer NOT NULL,
	"reward_dust" integer DEFAULT 0 NOT NULL,
	"reward_boosters" integer DEFAULT 0 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claimed_at" timestamp with time zone,
	"auto_claimed" boolean DEFAULT false NOT NULL,
	"rerolled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_missions_slot_unique" UNIQUE("league_id","user_id","period","period_key","slot"),
	CONSTRAINT "member_missions_period_check" CHECK ("member_missions"."period" IN ('day', 'week')),
	CONSTRAINT "member_missions_target_positive" CHECK ("member_missions"."target" >= 1),
	CONSTRAINT "member_missions_rewards_non_negative" CHECK ("member_missions"."reward_dust" >= 0 AND "member_missions"."reward_boosters" >= 0)
);
--> statement-breakpoint
CREATE TABLE "member_page_visits" (
	"league_id" uuid NOT NULL,
	"visitor_id" text NOT NULL,
	"visited_id" text NOT NULL,
	"day_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "member_page_visits_league_id_visitor_id_visited_id_day_key_pk" PRIMARY KEY("league_id","visitor_id","visited_id","day_key")
);
--> statement-breakpoint
CREATE TABLE "league_goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"week_key" text NOT NULL,
	"type" text NOT NULL,
	"target" integer NOT NULL,
	"bonus_target" integer NOT NULL,
	"factor" real DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"reached_at" timestamp with time zone,
	"bonus_reached_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "league_goals_week_unique" UNIQUE("league_id","week_key"),
	CONSTRAINT "league_goals_status_check" CHECK ("league_goals"."status" IN ('active', 'reached', 'bonus', 'missed')),
	CONSTRAINT "league_goals_type_check" CHECK ("league_goals"."type" IN ('photos', 'boosters', 'reactions', 'discoveries', 'bravos')),
	CONSTRAINT "league_goals_targets_positive" CHECK ("league_goals"."target" >= 1 AND "league_goals"."bonus_target" >= "league_goals"."target")
);
--> statement-breakpoint
ALTER TABLE "member_wallets" ADD COLUMN "bonus_boosters" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "member_wallets" ADD COLUMN "premium_gifts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "booster_openings" ADD COLUMN "source" text DEFAULT 'timer' NOT NULL;--> statement-breakpoint
ALTER TABLE "member_showcase" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "league_reads" ADD COLUMN "goal_banner_seen_week" text;--> statement-breakpoint
ALTER TABLE "member_missions" ADD CONSTRAINT "member_missions_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_missions" ADD CONSTRAINT "member_missions_member_fk" FOREIGN KEY ("league_id","user_id") REFERENCES "public"."league_members"("league_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_page_visits" ADD CONSTRAINT "member_page_visits_visitor_fk" FOREIGN KEY ("league_id","visitor_id") REFERENCES "public"."league_members"("league_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_goals" ADD CONSTRAINT "league_goals_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "member_missions_period_idx" ON "member_missions" USING btree ("period","period_key");--> statement-breakpoint
CREATE INDEX "card_tags_tagged_by_created_idx" ON "card_tags" USING btree ("tagged_by_id","created_at");--> statement-breakpoint
CREATE INDEX "reactions_user_created_idx" ON "reactions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "event_bravos_user_created_idx" ON "event_bravos" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "member_wallets" ADD CONSTRAINT "member_wallets_bonus_non_negative" CHECK ("member_wallets"."bonus_boosters" >= 0 AND "member_wallets"."premium_gifts" >= 0);--> statement-breakpoint
ALTER TABLE "booster_openings" ADD CONSTRAINT "booster_openings_source_check" CHECK ("booster_openings"."source" IN ('timer', 'bonus', 'premium_gift'));--> statement-breakpoint
UPDATE "member_showcase" SET "created_at" = '2000-01-01T00:00:00Z';
