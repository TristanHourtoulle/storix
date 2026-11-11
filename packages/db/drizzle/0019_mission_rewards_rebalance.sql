-- Rebalance mission dust rewards: open (unclaimed) missions pay the new catalogue amount.
UPDATE "member_missions" SET "reward_dust" = 40 WHERE "claimed_at" IS NULL AND "period" = 'day' AND "mission_id" = 'open_boosters' AND "reward_dust" = 15;
--> statement-breakpoint
UPDATE "member_missions" SET "reward_dust" = 60 WHERE "claimed_at" IS NULL AND "period" = 'day' AND "mission_id" = 'open_many_boosters' AND "reward_dust" = 25;
--> statement-breakpoint
UPDATE "member_missions" SET "reward_dust" = 25 WHERE "claimed_at" IS NULL AND "period" = 'day' AND "mission_id" = 'react' AND "reward_dust" = 10;
--> statement-breakpoint
UPDATE "member_missions" SET "reward_dust" = 40 WHERE "claimed_at" IS NULL AND "period" = 'day' AND "mission_id" = 'react_authors' AND "reward_dust" = 15;
--> statement-breakpoint
UPDATE "member_missions" SET "reward_dust" = 50 WHERE "claimed_at" IS NULL AND "period" = 'day' AND "mission_id" = 'post_photo' AND "reward_dust" = 20;
--> statement-breakpoint
UPDATE "member_missions" SET "reward_dust" = 25 WHERE "claimed_at" IS NULL AND "period" = 'day' AND "mission_id" = 'send_bravo' AND "reward_dust" = 10;
--> statement-breakpoint
UPDATE "member_missions" SET "reward_dust" = 50 WHERE "claimed_at" IS NULL AND "period" = 'day' AND "mission_id" = 'discover' AND "reward_dust" = 20;
--> statement-breakpoint
UPDATE "member_missions" SET "reward_dust" = 15 WHERE "claimed_at" IS NULL AND "period" = 'day' AND "mission_id" = 'visit_member' AND "reward_dust" = 5;
--> statement-breakpoint
UPDATE "member_missions" SET "reward_dust" = 25 WHERE "claimed_at" IS NULL AND "period" = 'day' AND "mission_id" = 'tag_self' AND "reward_dust" = 10;
--> statement-breakpoint
UPDATE "member_missions" SET "reward_dust" = 25 WHERE "claimed_at" IS NULL AND "period" = 'day' AND "mission_id" = 'edit_showcase' AND "reward_dust" = 10;
--> statement-breakpoint
UPDATE "member_missions" SET "reward_dust" = 120 WHERE "claimed_at" IS NULL AND "period" = 'week' AND "mission_id" = 'open_boosters' AND "reward_dust" = 60;
--> statement-breakpoint
UPDATE "member_missions" SET "reward_dust" = 160 WHERE "claimed_at" IS NULL AND "period" = 'week' AND "mission_id" = 'post_photos' AND "reward_dust" = 80;
--> statement-breakpoint
UPDATE "member_missions" SET "reward_dust" = 100 WHERE "claimed_at" IS NULL AND "period" = 'week' AND "mission_id" = 'react' AND "reward_dust" = 50;
--> statement-breakpoint
UPDATE "member_missions" SET "reward_dust" = 200 WHERE "claimed_at" IS NULL AND "period" = 'week' AND "mission_id" = 'promote' AND "reward_dust" = 100;
--> statement-breakpoint
UPDATE "member_missions" SET "reward_dust" = 160 WHERE "claimed_at" IS NULL AND "period" = 'week' AND "mission_id" = 'discover' AND "reward_dust" = 80;
--> statement-breakpoint
UPDATE "member_missions" SET "reward_dust" = 80 WHERE "claimed_at" IS NULL AND "period" = 'week' AND "mission_id" = 'send_bravos' AND "reward_dust" = 40;
--> statement-breakpoint
UPDATE "member_missions" SET "reward_dust" = 160 WHERE "claimed_at" IS NULL AND "period" = 'week' AND "mission_id" = 'foil' AND "reward_dust" = 80;
