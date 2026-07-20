CREATE TABLE "activity_segments" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"started_at" timestamp NOT NULL,
	"ended_at" timestamp NOT NULL,
	"kind" text NOT NULL,
	"process_name" text,
	"app_name" text,
	"exe_path" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_preferences" ADD COLUMN "activity_tracking_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "activity_segments" ADD CONSTRAINT "activity_segments_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_segments_user_started_idx" ON "activity_segments" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "activity_segments_user_process_idx" ON "activity_segments" USING btree ("user_id","process_name");