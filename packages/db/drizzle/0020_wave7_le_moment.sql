ALTER TYPE "public"."upload_kind" ADD VALUE 'selfie';--> statement-breakpoint
CREATE TABLE "moment_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"day" date NOT NULL,
	"user_id" text NOT NULL,
	"back_upload_id" uuid,
	"selfie_upload_id" uuid,
	"taken_at" timestamp with time zone NOT NULL,
	"late_minutes" integer NOT NULL,
	"reward_dust" integer NOT NULL,
	"reward_paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moment_posts_back_upload_id_unique" UNIQUE("back_upload_id"),
	CONSTRAINT "moment_posts_selfie_upload_id_unique" UNIQUE("selfie_upload_id"),
	CONSTRAINT "moment_posts_member_day_unique" UNIQUE("league_id","day","user_id"),
	CONSTRAINT "moment_posts_late_non_negative" CHECK ("moment_posts"."late_minutes" >= 0),
	CONSTRAINT "moment_posts_reward_non_negative" CHECK ("moment_posts"."reward_dust" >= 0)
);
--> statement-breakpoint
CREATE TABLE "moments" (
	"league_id" uuid NOT NULL,
	"day" date NOT NULL,
	"fires_at" timestamp with time zone NOT NULL,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "moments_league_id_day_pk" PRIMARY KEY("league_id","day")
);
--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "is_moment" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "moment_selfie_upload_id" uuid;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "moment_taken_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cards" ADD COLUMN "moment_late_minutes" integer;--> statement-breakpoint
ALTER TABLE "moment_posts" ADD CONSTRAINT "moment_posts_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moment_posts" ADD CONSTRAINT "moment_posts_back_upload_id_uploads_id_fk" FOREIGN KEY ("back_upload_id") REFERENCES "public"."uploads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moment_posts" ADD CONSTRAINT "moment_posts_selfie_upload_id_uploads_id_fk" FOREIGN KEY ("selfie_upload_id") REFERENCES "public"."uploads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moments" ADD CONSTRAINT "moments_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "moment_posts_league_user_idx" ON "moment_posts" USING btree ("league_id","user_id","late_minutes");--> statement-breakpoint
CREATE INDEX "cards_league_moment_idx" ON "cards" USING btree ("league_id","moment_taken_at") WHERE "cards"."moment_taken_at" is not null;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_moment_kind_check" CHECK (not "uploads"."is_moment" or "uploads"."kind" = 'card');--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_moment_fields_check" CHECK (("cards"."moment_selfie_upload_id" is null) = ("cards"."moment_taken_at" is null) and ("cards"."moment_taken_at" is null) = ("cards"."moment_late_minutes" is null));