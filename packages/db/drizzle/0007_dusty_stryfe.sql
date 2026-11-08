ALTER TYPE "public"."upload_status" ADD VALUE 'staged';--> statement-breakpoint
ALTER TYPE "public"."upload_status" ADD VALUE 'publishing';--> statement-breakpoint
ALTER TYPE "public"."upload_status" ADD VALUE 'discarded';--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "stage_only" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "crop" jsonb;--> statement-breakpoint
ALTER TABLE "uploads" ADD COLUMN "publish_requested_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "media" ADD COLUMN "crop" jsonb;