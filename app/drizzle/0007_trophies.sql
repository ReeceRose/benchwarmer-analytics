CREATE TABLE "award_winners" (
	"id" integer PRIMARY KEY NOT NULL,
	"trophy_id" integer NOT NULL,
	"season" integer NOT NULL,
	"status" text NOT NULL,
	"full_name" text NOT NULL,
	"player_id" integer,
	"team_id" integer,
	"franchise_id" integer,
	"is_rookie" boolean NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trophies" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"category_id" integer NOT NULL,
	"description" text,
	"image_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trophies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "award_winners" ADD CONSTRAINT "award_winners_trophy_id_trophies_id_fk" FOREIGN KEY ("trophy_id") REFERENCES "public"."trophies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_award_winners_trophy_id_season" ON "award_winners" USING btree ("trophy_id","season");--> statement-breakpoint
CREATE INDEX "ix_award_winners_player_id" ON "award_winners" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "ix_award_winners_franchise_id" ON "award_winners" USING btree ("franchise_id");