CREATE TABLE "draft_picks" (
	"id" integer PRIMARY KEY NOT NULL,
	"draft_year" integer NOT NULL,
	"round" integer NOT NULL,
	"pick_in_round" integer NOT NULL,
	"overall_pick" integer NOT NULL,
	"team_id" integer NOT NULL,
	"team_abbreviation" text NOT NULL,
	"franchise_id" integer,
	"player_id" integer,
	"player_name" text NOT NULL,
	"position" text,
	"amateur_club" text,
	"amateur_league" text,
	"country_code" text,
	"birth_date" date,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "franchise_head_to_head" (
	"franchise_id" integer NOT NULL,
	"opponent_franchise_id" integer NOT NULL,
	"is_playoffs" boolean NOT NULL,
	"games_played" integer NOT NULL,
	"wins" integer NOT NULL,
	"losses" integer NOT NULL,
	"ties" integer NOT NULL,
	"overtime_losses" integer NOT NULL,
	"goals_for" integer NOT NULL,
	"goals_against" integer NOT NULL,
	"last_meeting_season" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "franchise_seasons" (
	"franchise_id" integer NOT NULL,
	"season" integer NOT NULL,
	"team_id" integer NOT NULL,
	"team_abbreviation" text NOT NULL,
	"team_name" text NOT NULL,
	"games_played" integer NOT NULL,
	"wins" integer NOT NULL,
	"losses" integer NOT NULL,
	"ties" integer,
	"overtime_losses" integer,
	"points" integer NOT NULL,
	"goals_for" integer NOT NULL,
	"goals_against" integer NOT NULL,
	"division_name" text,
	"division_rank" integer,
	"league_rank" integer,
	"made_playoffs" boolean NOT NULL,
	"playoff_result" text,
	"playoff_round" integer,
	"won_cup" boolean NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "franchises" (
	"id" integer PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"team_abbreviation" text,
	"first_season" integer NOT NULL,
	"last_season" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_careers" (
	"player_id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"position" text,
	"games_played" integer NOT NULL,
	"goals" integer,
	"assists" integer,
	"points" integer,
	"wins" integer,
	"first_season" integer,
	"last_season" integer,
	"is_active" boolean NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "franchise_head_to_head" ADD CONSTRAINT "franchise_head_to_head_franchise_id_franchises_id_fk" FOREIGN KEY ("franchise_id") REFERENCES "public"."franchises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franchise_head_to_head" ADD CONSTRAINT "franchise_head_to_head_opponent_franchise_id_franchises_id_fk" FOREIGN KEY ("opponent_franchise_id") REFERENCES "public"."franchises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "franchise_seasons" ADD CONSTRAINT "franchise_seasons_franchise_id_franchises_id_fk" FOREIGN KEY ("franchise_id") REFERENCES "public"."franchises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ix_draft_picks_draft_year_overall_pick" ON "draft_picks" USING btree ("draft_year","overall_pick");--> statement-breakpoint
CREATE INDEX "ix_draft_picks_franchise_id_draft_year" ON "draft_picks" USING btree ("franchise_id","draft_year");--> statement-breakpoint
CREATE INDEX "ix_draft_picks_player_id" ON "draft_picks" USING btree ("player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "ix_franchise_head_to_head_franchise_opponent_playoffs" ON "franchise_head_to_head" USING btree ("franchise_id","opponent_franchise_id","is_playoffs");--> statement-breakpoint
CREATE UNIQUE INDEX "ix_franchise_seasons_franchise_id_season" ON "franchise_seasons" USING btree ("franchise_id","season");--> statement-breakpoint
CREATE INDEX "ix_franchise_seasons_team_id" ON "franchise_seasons" USING btree ("team_id");