CREATE TABLE "onboarding_reads" (
	"user_id" text PRIMARY KEY NOT NULL,
	"seen_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "onboarding_reads" ADD CONSTRAINT "onboarding_reads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
INSERT INTO "onboarding_reads" ("user_id", "seen_at") SELECT "id", now() FROM "user" ON CONFLICT DO NOTHING;
