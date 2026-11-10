CREATE TABLE "whats_new_reads" (
	"user_id" text PRIMARY KEY NOT NULL,
	"release_id" text NOT NULL,
	"seen_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "whats_new_reads" ADD CONSTRAINT "whats_new_reads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;