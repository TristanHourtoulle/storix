CREATE TYPE "public"."upload_rejection_reason" AS ENUM('DUPLICATE_PHOTO', 'INVALID_IMAGE');--> statement-breakpoint
CREATE TYPE "public"."upload_status" AS ENUM('pending', 'uploaded', 'processing', 'ready', 'rejected', 'failed');--> statement-breakpoint
CREATE TYPE "public"."capture_date_source" AS ENUM('exif', 'client');--> statement-breakpoint
CREATE TYPE "public"."card_status" AS ENUM('active', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."card_tier" AS ENUM('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic');--> statement-breakpoint
CREATE TABLE "uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"object_key" text NOT NULL,
	"status" "upload_status" DEFAULT 'pending' NOT NULL,
	"title" text,
	"tagged_user_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"client_captured_at" timestamp with time zone,
	"rejection_reason" "upload_rejection_reason",
	"card_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	CONSTRAINT "uploads_object_key_unique" UNIQUE("object_key")
);
--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"upload_id" uuid NOT NULL,
	"source_sha256" text NOT NULL,
	"phash" text NOT NULL,
	"thumbhash" text NOT NULL,
	"dominant_color" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"captured_at" timestamp with time zone,
	"capture_date_source" "capture_date_source",
	"is_capture_date_validated" boolean DEFAULT false NOT NULL,
	"variants" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_upload_id_unique" UNIQUE("upload_id"),
	CONSTRAINT "media_league_source_sha256_unique" UNIQUE("league_id","source_sha256")
);
--> statement-breakpoint
CREATE TABLE "card_tags" (
	"card_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "card_tags_card_id_user_id_pk" PRIMARY KEY("card_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"media_id" uuid NOT NULL,
	"author_id" text,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"tier" "card_tier" DEFAULT 'common' NOT NULL,
	"is_provisional" boolean DEFAULT true NOT NULL,
	"status" "card_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cards_media_id_unique" UNIQUE("media_id"),
	CONSTRAINT "cards_league_number_unique" UNIQUE("league_id","number")
);
--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_upload_id_uploads_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."uploads"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_tags" ADD CONSTRAINT "card_tags_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "card_tags" ADD CONSTRAINT "card_tags_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_media_id_media_id_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_author_id_user_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "uploads_league_user_created_idx" ON "uploads" USING btree ("league_id","user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "uploads_status_created_idx" ON "uploads" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "media_league_id_idx" ON "media" USING btree ("league_id");--> statement-breakpoint
CREATE INDEX "card_tags_user_id_idx" ON "card_tags" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cards_league_author_number_idx" ON "cards" USING btree ("league_id","author_id","number" DESC NULLS LAST);