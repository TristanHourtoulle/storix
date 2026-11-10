CREATE TABLE "member_emblems" (
	"league_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"emblem_id" text NOT NULL,
	"earned_at" timestamp with time zone NOT NULL,
	"seen_at" timestamp with time zone,
	"featured_rank" smallint,
	CONSTRAINT "member_emblems_league_id_user_id_emblem_id_pk" PRIMARY KEY("league_id","user_id","emblem_id"),
	CONSTRAINT "member_emblems_featured_rank_range" CHECK ("member_emblems"."featured_rank" IS NULL OR "member_emblems"."featured_rank" BETWEEN 1 AND 3)
);
--> statement-breakpoint
CREATE TABLE "member_showcase" (
	"league_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"slot" smallint NOT NULL,
	"card_id" uuid NOT NULL,
	CONSTRAINT "member_showcase_league_id_user_id_slot_pk" PRIMARY KEY("league_id","user_id","slot"),
	CONSTRAINT "member_showcase_card_unique" UNIQUE("league_id","user_id","card_id"),
	CONSTRAINT "member_showcase_slot_range" CHECK ("member_showcase"."slot" BETWEEN 1 AND 6)
);
--> statement-breakpoint
ALTER TABLE "card_tags" ADD COLUMN "tagged_by_id" text;--> statement-breakpoint
ALTER TABLE "card_tags" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
UPDATE "card_tags" SET "created_at" = '2000-01-01T00:00:00Z';--> statement-breakpoint
ALTER TABLE "member_emblems" ADD CONSTRAINT "member_emblems_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_emblems" ADD CONSTRAINT "member_emblems_member_fk" FOREIGN KEY ("league_id","user_id") REFERENCES "public"."league_members"("league_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_showcase" ADD CONSTRAINT "member_showcase_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_showcase" ADD CONSTRAINT "member_showcase_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "member_showcase" ADD CONSTRAINT "member_showcase_member_fk" FOREIGN KEY ("league_id","user_id") REFERENCES "public"."league_members"("league_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "member_emblems_featured_rank_unique" ON "member_emblems" USING btree ("league_id","user_id","featured_rank") WHERE "member_emblems"."featured_rank" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "card_tags" ADD CONSTRAINT "card_tags_tagged_by_id_user_id_fk" FOREIGN KEY ("tagged_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;