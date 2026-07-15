CREATE TABLE "garden_members" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"member_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "garden_members" ADD CONSTRAINT "garden_members_owner_id_user_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "garden_members" ADD CONSTRAINT "garden_members_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "garden_members_owner_member_idx" ON "garden_members" USING btree ("owner_id","member_id");