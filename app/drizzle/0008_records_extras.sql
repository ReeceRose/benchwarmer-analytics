CREATE TABLE "coaches" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"stanley_cups" integer NOT NULL,
	"in_hall_of_fame" boolean NOT NULL,
	"is_active" boolean NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "draft_lotteries" (
	"draft_year" integer PRIMARY KEY NOT NULL,
	"format" text,
	"odds_image_url" text,
	"notes" text,
	"results" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "franchise_people" (
	"franchise_id" integer NOT NULL,
	"role" text NOT NULL,
	"position" integer NOT NULL,
	"name" text NOT NULL,
	"tenure" text,
	"sweater_number" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hall_of_fame" (
	"player_id" integer PRIMARY KEY NOT NULL,
	"inducted_year" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "league_attendance" (
	"season" integer PRIMARY KEY NOT NULL,
	"regular" integer,
	"playoffs" integer,
	"total" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "milestone_moments" (
	"id" text PRIMARY KEY NOT NULL,
	"kind" text NOT NULL,
	"player_id" integer NOT NULL,
	"name" text NOT NULL,
	"season" integer NOT NULL,
	"game_id" text NOT NULL,
	"game_date" date NOT NULL,
	"team_id" integer,
	"team_name" text,
	"home_team" text,
	"away_team" text,
	"home_score" integer,
	"away_score" integer,
	"age_years" integer,
	"games_played" integer,
	"season_total" integer,
	"goalie_name" text,
	"is_active" boolean NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "officials" (
	"id" integer PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"official_type" text NOT NULL,
	"sweater_number" integer,
	"first_regular_game_id" text,
	"first_playoff_game_id" text,
	"country_code" text,
	"is_active" boolean NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "player_careers" ADD COLUMN "playoff_games" integer;--> statement-breakpoint
ALTER TABLE "player_careers" ADD COLUMN "game_seven_wins" integer;--> statement-breakpoint
ALTER TABLE "player_careers" ADD COLUMN "game_seven_losses" integer;--> statement-breakpoint
ALTER TABLE "player_careers" ADD COLUMN "playoff_overtime_wins" integer;--> statement-breakpoint
ALTER TABLE "player_careers" ADD COLUMN "playoff_overtime_losses" integer;--> statement-breakpoint
ALTER TABLE "player_careers" ADD COLUMN "playoff_overtime_save_pct" numeric;--> statement-breakpoint
ALTER TABLE "franchise_people" ADD CONSTRAINT "franchise_people_franchise_id_franchises_id_fk" FOREIGN KEY ("franchise_id") REFERENCES "public"."franchises"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "ix_franchise_people_franchise_id_role_position" ON "franchise_people" USING btree ("franchise_id","role","position");--> statement-breakpoint
CREATE INDEX "ix_milestone_moments_kind_game_date" ON "milestone_moments" USING btree ("kind","game_date");--> statement-breakpoint
CREATE INDEX "ix_milestone_moments_player_id" ON "milestone_moments" USING btree ("player_id");