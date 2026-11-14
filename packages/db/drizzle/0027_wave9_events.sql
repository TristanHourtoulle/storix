ALTER TABLE "card_series" ADD COLUMN "start_notified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "card_series" ADD COLUMN "end_notified_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "card_series_event_start_push_idx" ON "card_series" USING btree ("starts_at") WHERE "card_series"."kind" = 'event' AND "card_series"."start_notified_at" IS NULL;--> statement-breakpoint
CREATE INDEX "card_series_event_open_idx" ON "card_series" USING btree ("league_id","ends_at") WHERE "card_series"."kind" = 'event' AND "card_series"."closed_at" IS NULL;