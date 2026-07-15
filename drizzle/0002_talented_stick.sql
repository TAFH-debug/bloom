DROP INDEX "habit_completions_habit_day_idx";--> statement-breakpoint
ALTER TABLE "habit_completions" ADD COLUMN "slot" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "habits" ADD COLUMN "frequency" text DEFAULT 'daily' NOT NULL;--> statement-breakpoint
ALTER TABLE "habits" ADD COLUMN "times_per_period" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "habits" ADD COLUMN "custom_every_days" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "habit_completions_habit_day_slot_idx" ON "habit_completions" USING btree ("habit_id","completed_on","slot");