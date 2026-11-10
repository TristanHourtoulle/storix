CREATE TABLE "league_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"league_id" uuid NOT NULL,
	"actor_id" text,
	"type" text NOT NULL,
	"card_id" uuid,
	"tier" "card_tier",
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"dedupe_key" text,
	"visible_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "league_events_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "league_reads" (
	"league_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"feed_seen_at" timestamp with time zone,
	"mythic_banner_seen_at" timestamp with time zone,
	"journal_seen_at" timestamp with time zone,
	CONSTRAINT "league_reads_league_id_user_id_pk" PRIMARY KEY("league_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "event_bravos" (
	"event_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_bravos_event_id_user_id_pk" PRIMARY KEY("event_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "league_events" ADD CONSTRAINT "league_events_league_id_leagues_id_fk" FOREIGN KEY ("league_id") REFERENCES "public"."leagues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_events" ADD CONSTRAINT "league_events_actor_id_user_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_events" ADD CONSTRAINT "league_events_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "league_reads" ADD CONSTRAINT "league_reads_member_fk" FOREIGN KEY ("league_id","user_id") REFERENCES "public"."league_members"("league_id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_bravos" ADD CONSTRAINT "event_bravos_event_id_league_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."league_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_bravos" ADD CONSTRAINT "event_bravos_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "league_events_league_visible_idx" ON "league_events" USING btree ("league_id","visible_at" DESC NULLS LAST,"id" DESC NULLS LAST);--> statement-breakpoint
INSERT INTO "league_events" ("league_id", "actor_id", "type", "payload", "dedupe_key", "visible_at", "created_at")
SELECT o."league_id", o."user_id", 'booster_opened',
  jsonb_strip_nulls(jsonb_build_object('openingId', o."id", 'isPremium', o."is_premium", 'tier', (SELECT max(p."tier_at_mint") FROM "booster_pulls" p WHERE p."opening_id" = o."id"))),
  'opening:' || o."id", o."opened_at", o."opened_at"
FROM "booster_openings" o
WHERE o."opened_at" > now() - interval '30 days'
ON CONFLICT ("dedupe_key") DO NOTHING;--> statement-breakpoint
INSERT INTO "league_events" ("league_id", "actor_id", "type", "card_id", "tier", "payload", "dedupe_key", "visible_at", "created_at")
SELECT o."league_id", o."user_id", 'card_pulled', p."card_id", p."tier_at_mint",
  jsonb_build_object('openingId', o."id", 'tier', p."tier_at_mint", 'isDiscovery', p."is_discovery"),
  'pull:' || o."id" || ':' || p."slot", o."opened_at", o."opened_at"
FROM "booster_pulls" p
JOIN "booster_openings" o ON o."id" = p."opening_id"
WHERE o."opened_at" > now() - interval '30 days'
  AND p."card_id" IS NOT NULL
  AND (p."tier_at_mint" >= 'epic' OR p."is_discovery")
ON CONFLICT ("dedupe_key") DO NOTHING;--> statement-breakpoint
INSERT INTO "league_events" ("league_id", "actor_id", "type", "card_id", "dedupe_key", "visible_at", "created_at")
SELECT c."league_id", c."author_id", 'card_published', c."id", 'publish:' || c."id",
  c."created_at" + make_interval(mins => coalesce((l."settings"->>'newCardDelayMinutes')::int, 60)),
  c."created_at"
FROM "cards" c
JOIN "leagues" l ON l."id" = c."league_id"
WHERE c."status" = 'active' AND c."created_at" > now() - interval '30 days'
ON CONFLICT ("dedupe_key") DO NOTHING;--> statement-breakpoint
INSERT INTO "league_events" ("league_id", "actor_id", "type", "dedupe_key", "visible_at", "created_at")
SELECT m."league_id", m."user_id", 'member_joined',
  'join:' || m."league_id" || ':' || m."user_id" || ':' || floor(extract(epoch FROM m."joined_at") * 1000)::bigint,
  m."joined_at", m."joined_at"
FROM "league_members" m
WHERE m."joined_at" > now() - interval '30 days'
ON CONFLICT ("dedupe_key") DO NOTHING;--> statement-breakpoint
INSERT INTO "league_events" ("league_id", "actor_id", "type", "payload", "dedupe_key", "visible_at", "created_at")
SELECT e."league_id", e."user_id", 'emblem_unlocked', jsonb_build_object('emblemId', e."emblem_id"),
  'emblem:' || e."league_id" || ':' || e."user_id" || ':' || e."emblem_id", e."earned_at", e."earned_at"
FROM "member_emblems" e
ON CONFLICT ("dedupe_key") DO NOTHING;--> statement-breakpoint
INSERT INTO "league_reads" ("league_id", "user_id", "feed_seen_at", "mythic_banner_seen_at", "journal_seen_at")
SELECT m."league_id", m."user_id", now(), now(), now()
FROM "league_members" m
ON CONFLICT ("league_id", "user_id") DO NOTHING;
