CREATE TYPE "public"."upload_kind" AS ENUM('card', 'avatar', 'league');--> statement-breakpoint
CREATE TYPE "public"."portrait_kind" AS ENUM('avatar', 'league');--> statement-breakpoint
ALTER TYPE "public"."upload_rejection_reason" ADD VALUE 'NOT_ALLOWED';--> statement-breakpoint
CREATE TABLE "portraits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "portrait_kind" NOT NULL,
	"user_id" text,
	"league_id" uuid,
	"upload_id" uuid NOT NULL,
	"dominant_color" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "portraits_upload_id_unique" UNIQUE("upload_id"),
	CONSTRAINT "portraits_owner_check" CHECK (("portraits"."kind" = 'avatar' and "portraits"."user_id" is not null and "portraits"."league_id" is null) or ("portraits"."kind" = 'league' and "portraits"."league_id" is not null and "portraits"."user_id" is null))
);
--> statement-breakpoint
ALTER TABLE "uploads" ALTER COLUMN "league_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "kind" "upload_kind" DEFAULT 'card' NOT NULL;--> statement-breakpoint
ALTER TABLE "portraits" ADD CONSTRAINT "portraits_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portraits" ADD CONSTRAINT "portraits_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portraits" ADD CONSTRAINT "portraits_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "portraits_user_unique" ON "portraits" USING btree ("user_id") WHERE "portraits"."user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "portraits_league_unique" ON "portraits" USING btree ("league_id") WHERE "portraits"."league_id" is not null;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_kind_league_check" CHECK (("uploads"."kind" = 'avatar') = ("uploads"."league_id" is null));--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_portrait_flow_check" CHECK ("uploads"."kind" = 'card' or (not "uploads"."stage_only" and "uploads"."crop" is null and "uploads"."publish_requested_at" is null));