ALTER TABLE "uploads" DROP CONSTRAINT "uploads_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "uploads" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;