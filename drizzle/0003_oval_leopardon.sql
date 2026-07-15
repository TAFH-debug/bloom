CREATE TABLE "user_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"reminder_window_start" integer DEFAULT 9 NOT NULL,
	"reminder_window_end" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "status_preset" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "status_note" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "status_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;