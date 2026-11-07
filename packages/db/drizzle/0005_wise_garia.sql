CREATE TYPE "public"."removal_reason" AS ENUM('admin_deleted', 'withdrawn', 'member_removed', 'member_left', 'account_deleted', 'league_deleted');--> statement-breakpoint
CREATE TABLE "card_compensations" (
	"card_id" uuid NOT NULL,
	"league_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"dust" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "card_compensations_card_id_user_id_pk" PRIMARY KEY("card_id","user_id"),
	CONSTRAINT "card_compensations_dust_positive" CHECK ("card_compensations"."dust" > 0)
);
--> statement-breakpoint
CREATE TABLE "card_removals" (
	"card_id" uuid PRIMARY KEY NOT NULL,
	"league_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"media_prefix" text NOT NULL,
	"reason" "removal_reason" NOT NULL,
	"actor_id" text,
	"removed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "card_compensations" ADD CONSTRAINT "card_compensations_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_compensations" ADD CONSTRAINT "card_compensations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_removals" ADD CONSTRAINT "card_removals_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_removals" ADD CONSTRAINT "card_removals_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "card_compensations_league_user_idx" ON "card_compensations" USING btree ("league_id","user_id");--> statement-breakpoint
CREATE INDEX "card_removals_league_removed_idx" ON "card_removals" USING btree ("league_id","removed_at");